import { trace, metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("smoke-test-meter");
const counter = meter.createCounter("smoke_test_counter", {
  description: "Simple test",
});

const tracer = trace.getTracer("smoke-test-tracer");

console.log("Sending test signal...");

// 1. Record your Counter Metric
counter.add(1, { test_attribute: "value" });

// 2. Execute and track your Span Trace
tracer.startActiveSpan("smoke-test-span", (span) => {
  console.log("Trace span created...");
  span.end();
});

console.log(
  "Signal generated. Waiting 2 seconds for gRPC export queue to flush...",
);

// 3. FIXED: Keeps the runtime alive so the background OTel engine can complete the network request
await new Promise((resolve) => setTimeout(resolve, 2000));

console.log("Signal sent successfully. Exiting.");
