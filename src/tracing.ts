import * as opentelemetry from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { envDetector, processDetector, Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";

import { containerDetector } from "@opentelemetry/resource-detector-container";
import { SocketIoInstrumentation } from "opentelemetry-instrumentation-socket.io";
import type { Socket } from "socket.io";

import { randomUUID } from "crypto";

const resource = Resource.default().merge(
    new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "bagman",
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version,
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: randomUUID()
    })
);

const traceExporter = new OTLPTraceExporter({
    url: process.env.OTLP_TRACES_EXPORT_URL,
});

const processer = new BatchSpanProcessor(traceExporter);

const instrumentations = [new SocketIoInstrumentation({
    traceReserved: true,
    emitIgnoreEventList: ['newListener', 'removeListener'],
    onHook(span, { payload }) {
        if (payload.length > 0 && payload[0].constructor && payload[0].constructor.name == "Socket") {
            const [socket] = payload as [Socket];
            for (const [k, v] of Object.entries(socket.handshake.query)) {
                if (v) {
                    span.setAttribute(`handshake.query.${k}`, v);
                }
            }
        }
    }
})];

const metricExporter = new OTLPMetricExporter({
    url: process.env.OTLP_METRICS_EXPORT_URL,
});

const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 5000
});


const sdk = new opentelemetry.NodeSDK({
    traceExporter,
    metricReader,
    instrumentations,
    resource,
    spanProcessor: processer,
    autoDetectResources: true,
    resourceDetectors: [containerDetector, envDetector, processDetector]
});

sdk.start();

process.on('SIGTERM', () => {
    sdk.shutdown()
    .finally(() => process.exit(0));
})