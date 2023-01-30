import otel from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import {
    MeterProvider,
    PeriodicExportingMetricReader
} from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"; 

import { SocketIoInstrumentation } from "opentelemetry-instrumentation-socket.io";
import type { Socket } from "socket.io";

registerInstrumentations({
    instrumentations: [new SocketIoInstrumentation({
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
    })]
});

const resource = Resource.default().merge(
    new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: "bagman",
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version
    })
);

const provider = new NodeTracerProvider({
    resource
});


const traceExporter = new OTLPTraceExporter({
    url: process.env.OTLP_TRACES_EXPORT_URL
});
const processer = new BatchSpanProcessor(traceExporter);

provider.addSpanProcessor(processer);
provider.register();

const metricExporter = new OTLPMetricExporter({
    url: process.env.OTLP_METRICS_EXPORT_URL
});

const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
});

const meterProvider = new MeterProvider({
  resource,
});

meterProvider.addMetricReader(metricReader);

// Set this MeterProvider to be global to the app being instrumented.
otel.metrics.setGlobalMeterProvider(meterProvider)