import { trace, metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("smoke-test-meter");
const counter = meter.createCounter("smoke_test_counter", {
  description: "Simple test",
});
const tracer = trace.getTracer("smoke-test-tracer");

console.log("Sending test signals...");

// Send a metric
counter.add(1, { test_attribute: "value" });

// Send a trace
tracer.startActiveSpan("smoke-test-span", (span) => {
  console.log("Trace span created...");
  span.end();
});

console.log("Signals sent. Waiting for export...");

// Keep the process alive for a few seconds so the exporters can flush
setTimeout(() => {
  console.log("Done.");
  process.exit(0);
}, 5000);
