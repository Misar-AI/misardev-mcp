---
name: connect-custom-domain
description: Attach a domain the user owns to a published MisarDev project and walk them through the DNS record until TLS is live. Use for "use my own domain", custom domain setup, or a domain that is not serving yet.
---

# Connect a custom domain

## Steps

1. `get_deployment_status` — the project must be published first. If it is not,
   ship it (see `ship-a-project`) before touching domains.
2. `lookup_domain` — confirm the domain is registered and see who the registrar
   is, so the DNS instructions point at the right dashboard.
3. **Confirm with the user**, then `set_custom_domain`. Custom domains are a
   paid capability; a blocked call returns an upgrade card — relay it as-is.
4. Give the user the exact DNS record from the response (type, host, value).
   A paraphrased record is a broken record.
5. `get_custom_domain` to check whether DNS resolves yet. Propagation can take
   minutes to hours; a "not yet" right after setting the record is expected,
   not an error. TLS is issued automatically once it resolves.

## Removing a domain

`remove_custom_domain` stops the domain serving the app immediately (the
default subdomain keeps working). Confirm before calling it, and remind the
user to delete the DNS record at their registrar too.
