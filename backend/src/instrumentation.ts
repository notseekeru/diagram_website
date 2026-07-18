import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

// 1. Explicitly grabs the interval from .env (Default to 10s if missing)
const exportInterval = Number.parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || "10000", 10);

const sdk = new NodeSDK({
    // 2. Explicitly define endpoints to match your .env
    traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    }),

    metricReaders: [
        new PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
                url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
            }),
            // 3. FORCE the interval so it doesn't wait 60s
            exportIntervalMillis: exportInterval,
        }),
    ],

    instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on("SIGTERM", () => {
    sdk.shutdown()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
});
