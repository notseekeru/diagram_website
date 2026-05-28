import { trace } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";

// 1. Initialize the OpenTelemetry SDK first
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: "diagram-backend",
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || "development",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    }),
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// 2. Start the SDK to bind the global tracer provider
sdk.start();

// 3. Create your custom spans AFTER the SDK is active
const tracer = trace.getTracer("my-custom-tracer");

console.log("Starting custom span...");
tracer.startActiveSpan("THE_DIDDY_BLUD_MANUAL", (span) => {
  console.log("Triggering the validation span...");
  span.setAttribute("user.action", "manual_validation");
  span.end();
});

console.log("Smoke test complete.");

// 4. Handle graceful shutdown
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("Telemetry SDK shut down successfully"))
    .catch((error) => console.log("Error shutting down SDK", error))
    .finally(() => process.exit(0));
});
