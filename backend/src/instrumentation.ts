import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";

// The engine automatically registers process-level environment variables
const sdk = new NodeSDK({
  // Modern configuration reads OTEL_SERVICE_NAME directly from your .env
  traceExporter: new OTLPTraceExporter(),
  metricExporter: new OTLPMetricExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Keeps your console clean by removing heavy file-system logs
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

try {
  sdk.start();
  console.log("Telemetry initialized successfully [gRPC Pipeline Active]");
} catch (error) {
  console.error("Critical Error bootstrapping OpenTelemetry SDK:", error);
}

// Graceful container cleanup handler
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() =>
      console.log("Telemetry processing engine flushed and terminated."),
    )
    .catch((error) => console.error("Error during telemetry shutdown:", error))
    .finally(() => process.exit(0));
});
