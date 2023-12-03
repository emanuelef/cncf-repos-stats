package main

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptrace"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/emanuelef/cncf-repos-stats/otel_instrumentation"
	"github.com/emanuelef/github-repo-activity-stats/repostats"
	"github.com/emanuelef/github-repo-activity-stats/stats"
	"github.com/go-resty/resty/v2"
	_ "github.com/joho/godotenv/autoload"
	"go.opentelemetry.io/contrib/instrumentation/net/http/httptrace/otelhttptrace"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/oauth2"
	"golang.org/x/sync/semaphore"
	"gopkg.in/yaml.v3"
)

const (
	CNCFProjectsYamlUrl  = "https://raw.githubusercontent.com/cncf/devstats/master/projects.yaml"
	CNCFLandscapeYamlUrl = "https://raw.githubusercontent.com/cncf/landscape/master/landscape.yml"
)

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if len(value) == 0 {
		return defaultValue
	}
	return value
}

func writeGoDepsMapFile(deps map[string]int) {
	currentTime := time.Now()
	outputFile, err := os.Create(fmt.Sprintf("dep-repo-%s.csv", getEnv("FILE_SUFFIX", (currentTime.Format("02-01-2006")))))
	if err != nil {
		log.Fatal(err)
	}

	defer outputFile.Close()

	csvWriter := csv.NewWriter(outputFile)
	defer csvWriter.Flush()

	headerRow := []string{
		"dep", "go_cncf_repos_using_dep",
	}

	err = csvWriter.Write(headerRow)

	if err != nil {
		log.Fatal(err)
	}

	for k, v := range deps {
		if v > 10 {
			err = csvWriter.Write([]string{
				k,
				fmt.Sprintf("%d", v),
			})

			if err != nil {
				log.Fatal(err)
			}
		}
	}
}

var tracer trace.Tracer

func init() {
	tracer = otel.Tracer("github.com/emanuelef/cncf-repos-stats")
}

func main() {
	ctx := context.Background()

	starsHistory := map[string][]stats.StarsPerDay{}
	commitsHistory := map[string][]stats.CommitsPerDay{}

	tp, exp, err := otel_instrumentation.InitializeGlobalTracerProvider(ctx)
	// Handle shutdown to ensure all sub processes are closed correctly and telemetry is exported
	if err != nil {
		log.Fatalf("failed to initialize OpenTelemetry: %e", err)
	}

	ctx, span := tracer.Start(ctx, "fetch-all-stats")

	defer func() {
		fmt.Println("before End")
		span.End()
		time.Sleep(10 * time.Second)
		fmt.Println("before exp Shutdown")
		_ = exp.Shutdown(ctx)
		fmt.Println("before tp Shutdown")
		_ = tp.Shutdown(ctx)
	}()

	semWeight, _ := strconv.ParseInt(getEnv("MAX_CONCURRENT_REQUESTS", "10"), 10, 64)

	log.Printf("Running %d concurrent requests", semWeight)

	var mutex sync.Mutex
	sem := semaphore.NewWeighted(semWeight)
	var wg sync.WaitGroup

	currentTime := time.Now()
	outputFile, err := os.Create(fmt.Sprintf("analysis-%s.csv", getEnv("FILE_SUFFIX", currentTime.Format("02-01-2006"))))
	if err != nil {
		log.Fatal(err)
	}

	defer outputFile.Close()

	csvWriter := csv.NewWriter(outputFile)
	defer csvWriter.Flush()

	headerRow := []string{
		"repo", "stars", "new-stars-last-30d", "new-stars-last-14d",
		"new-stars-last-7d", "new-stars-last-24H", "stars-per-mille-30d",
		"days-last-star", "days-last-commit",
		"days-since-creation", "mentionable-users",
		"language",
		"archived", "dependencies",
		"status",
		"start_date", "join_date",
		"liveness",
		"unique-contributors",
		"new-commits-last-30d",
		"min-go-version",
	}

	err = csvWriter.Write(headerRow)

	if err != nil {
		log.Fatal(err)
	}

	depsUse := map[string]int{}

	tokenSource := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: os.Getenv("PAT")},
	)

	oauthClient := oauth2.NewClient(context.Background(), tokenSource)
	// client := repostats.NewClient(&oauthClient.Transport)
	client := repostats.NewClientGQL(oauthClient)

	restyClient := resty.NewWithClient(
		&http.Client{
			Transport: otelhttp.NewTransport(http.DefaultTransport,
				otelhttp.WithClientTrace(func(ctx context.Context) *httptrace.ClientTrace {
					return otelhttptrace.NewClientTrace(ctx)
				})),
		},
	)

	restyReq := restyClient.R()
	restyReq.SetContext(ctx)
	resp, err := restyReq.Get(CNCFProjectsYamlUrl)
	if err == nil {
		m := make(map[any]any)

		err = yaml.Unmarshal([]byte(resp.Body()), &m)
		if err != nil {
			log.Fatalf("error: %v", err)
		}

		for key, val := range m["projects"].(map[string]any) {
			wg.Add(1)

			go func(key string, val any) {
				err = sem.Acquire(ctx, 1)

				if err != nil {
					log.Fatalf("Error acquiring semaphore %v", err)
				}

				defer sem.Release(1)
				defer wg.Done()
				p := val.(map[string]any)
				fmt.Printf("%s %s %s\n", key, p["main_repo"], p["status"])
				if p["status"].(string) != "-" {
					result, err := client.GetAllStats(ctx, p["main_repo"].(string))
					if err != nil {
						fmt.Println("retrying after 5 minutes")
						time.Sleep(5 * time.Minute)
						result, err = client.GetAllStats(ctx, p["main_repo"].(string))
						log.Fatalf("Error getting all stats %v", err)
					}

					fmt.Println(result)

					daysSinceLastStar := int(currentTime.Sub(result.LastStarDate).Hours() / 24)
					daysSinceLastCommit := int(currentTime.Sub(result.LastCommitDate).Hours() / 24)
					daysSinceCreation := int(currentTime.Sub(result.CreatedAt).Hours() / 24)

					mutex.Lock()
					err = csvWriter.Write([]string{
						fmt.Sprintf("%s", p["main_repo"]),
						fmt.Sprintf("%d", result.Stars),
						fmt.Sprintf("%d", result.StarsHistory.AddedLast30d),
						fmt.Sprintf("%d", result.StarsHistory.AddedLast14d),
						fmt.Sprintf("%d", result.StarsHistory.AddedLast7d),
						fmt.Sprintf("%d", result.StarsHistory.AddedLast24H),
						fmt.Sprintf("%.3f", result.StarsHistory.AddedPerMille30d),
						fmt.Sprintf("%d", daysSinceLastStar),
						fmt.Sprintf("%d", daysSinceLastCommit),
						fmt.Sprintf("%d", daysSinceCreation),
						fmt.Sprintf("%d", result.MentionableUsers),
						result.Language,
						fmt.Sprintf("%t", result.Archived),
						fmt.Sprintf("%d", len(result.DirectDeps)),
						fmt.Sprintf("%s", p["status"]),
						fmt.Sprintf("%s", p["start_date"]),
						fmt.Sprintf("%s", p["join_date"]),
						fmt.Sprintf("%.3f", result.LivenessScore),
						fmt.Sprintf("%d", result.DifferentAuthors),
						fmt.Sprintf("%d", result.CommitsHistory.AddedLast30d),
						fmt.Sprintf(result.GoVersion),
					})

					if err != nil {
						log.Fatal(err)
					}

					if len(result.DirectDeps) > 0 {
						for _, dep := range result.DirectDeps {
							depsUse[dep] += 1
						}
					}

					starsHistory[p["main_repo"].(string)] = result.StarsTimeline
					commitsHistory[p["main_repo"].(string)] = result.CommitsTimeline

					mutex.Unlock()
				}
			}(key, val)
		}
		wg.Wait()
		writeGoDepsMapFile(depsUse)

		jsonData, _ := json.MarshalIndent(starsHistory, "", " ")
		_ = os.WriteFile("stars-history-30d.json", jsonData, 0o644)

		commitsJsonData, _ := json.MarshalIndent(commitsHistory, "", " ")
		_ = os.WriteFile("commits-history-30d.json", commitsJsonData, 0o644)
	}

	elapsed := time.Since(currentTime)
	log.Printf("Took %s\n", elapsed)
}
