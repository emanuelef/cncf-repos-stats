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
	"strings"
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
	GitHubBaseUrl        = "https://github.com/"
)

type Item struct {
	Name        string `yaml:"name"`
	HomepageURL string `yaml:"homepage_url"`
	Project     string `yaml:"project"`
	RepoURL     string `yaml:"repo_url"`
	Extra       Extra  `yaml:"extra"`
}

type Extra struct {
	Accepted    string `yaml:"accepted"`
	DevStatsURL string `yaml:"dev_stats_url"`
}

type Subcategory struct {
	Name  string `yaml:"name"`
	Items []Item `yaml:"items"`
}

type Category struct {
	Name          string        `yaml:"name"`
	Subcategories []Subcategory `yaml:"subcategories"`
}

type Landscape struct {
	Categories []Category `yaml:"landscape"`
}

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
		"category",
		"subcategory",
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
	resp, err := restyReq.Get(CNCFLandscapeYamlUrl)
	if err == nil {
		var landscape Landscape
		err = yaml.Unmarshal([]byte(resp.Body()), &landscape)
		if err != nil {
			log.Fatalf("Error unmarshalling YAML: %v", err)
		}

		uniqueRepos := make(map[string]bool)

		for _, category := range landscape.Categories {
			for _, subcategory := range category.Subcategories {
				for _, item := range subcategory.Items {
					// Check if the item has a specific project value
					if item.Project != "" && strings.Contains(item.RepoURL, GitHubBaseUrl) {
						// Print or process the item as needed
						fmt.Printf("Item Name: %s\n", item.Name)
						fmt.Printf("Project: %s\n", item.Project)
						fmt.Println("------------------------")

						wg.Add(1)

						go func(item Item, category, subcategory string) {
							err = sem.Acquire(ctx, 1)

							if err != nil {
								log.Fatalf("Error acquiring semaphore %v", err)
							}

							repo := strings.TrimPrefix(item.RepoURL, GitHubBaseUrl)

							defer sem.Release(1)
							defer wg.Done()

							// TODO: Make it thread safe
							if _, exists := uniqueRepos[repo]; !exists {
								uniqueRepos[repo] = true
							} else {
								return
							}

							result, err := client.GetAllStats(ctx, repo)
							if err != nil {
								fmt.Println("retrying after 5 minutes")
								time.Sleep(1 * time.Minute)
								result, err = client.GetAllStats(ctx, repo)
								if err != nil {
									//log.Fatalf("Error getting all stats %s %v", repo, err)
									return
								}
							}

							fmt.Println(result)

							daysSinceLastStar := int(currentTime.Sub(result.LastStarDate).Hours() / 24)
							daysSinceLastCommit := int(currentTime.Sub(result.LastCommitDate).Hours() / 24)
							daysSinceCreation := int(currentTime.Sub(result.CreatedAt).Hours() / 24)

							mutex.Lock()
							err = csvWriter.Write([]string{
								repo,
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
								item.Project,
								fmt.Sprintf("%s", item.Extra.Accepted),
								fmt.Sprintf("%s", item.Extra.Accepted),
								fmt.Sprintf("%.3f", result.LivenessScore),
								fmt.Sprintf("%d", result.DifferentAuthors),
								fmt.Sprintf("%d", result.CommitsHistory.AddedLast30d),
								fmt.Sprintf(result.GoVersion),
								category,
								subcategory,
							})

							if err != nil {
								log.Fatal(err)
							}

							if len(result.DirectDeps) > 0 {
								for _, dep := range result.DirectDeps {
									depsUse[dep] += 1
								}
							}

							starsHistory[repo] = result.StarsTimeline
							commitsHistory[repo] = result.CommitsTimeline

							mutex.Unlock()
						}(item, category.Name, subcategory.Name)

					}
				}
			}
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
