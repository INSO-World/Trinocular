FROM fluent/fluent-bit:latest

# Manually "install" a shell by copying it from the busybox image
# See: https://stackoverflow.com/a/71756170
# We cannot install to /bin/sh as kinoko errors out when we use the same 
# source and destination path
COPY --from=busybox:1.37.0-uclibc /bin/sh /usr/local/bin/sh
