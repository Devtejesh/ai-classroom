package monitoring

import "github.com/prometheus/client_golang/prometheus"

// var HttpRequestsTotal = prometheus.NewCounter(
// 	prometheus.CounterOpts{
// 		Name: "http_requests_total",
// 		Help: "Total number of monitored Http requests.",
// 	},
// )

// func init() {
// 	prometheus.MustRegister(HttpRequestsTotal)
// }

var HttpRequestsTotal1 = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of monitored http requests.",
	},
	[]string{"method", "route", "status"},
)

var ActiveRequests = prometheus.NewGauge(
	prometheus.GaugeOpts{
		Name: "http_active_requests",
		Help: "Number of curretnly processing Http requests",
	},
)
var HTTPRequestDuration = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "http_request_duration_seconds",
		Help:    "HTTP request processing duration in seconds.",
		Buckets: prometheus.DefBuckets,
	},
	[]string{"method", "route", "status"},
)

func init() {
	prometheus.MustRegister(HttpRequestsTotal1)
	prometheus.MustRegister(ActiveRequests)
	prometheus.MustRegister(HTTPRequestDuration)
}
