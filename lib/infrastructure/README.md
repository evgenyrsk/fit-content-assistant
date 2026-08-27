# Infrastructure adapters

Vendor SDKs, persistence clients and external HTTP integrations live here. Each adapter implements a port from `lib/application/ports` and is wired only in the composition root. Domain code must never import this directory.
