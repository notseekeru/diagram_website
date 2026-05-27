import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-grpc";

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  metricExporter: new OTLPMetricExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
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

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() =>
      console.log("Telemetry processing engine flushed and terminated."),
    )
    .catch((error) => console.error("Error during telemetry shutdown:", error))
    .finally(() => process.exit(0));
});
