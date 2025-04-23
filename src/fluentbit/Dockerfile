FROM fluent/fluent-bit:3.2.0-amd64

# Manually "install" a shell by copying it from the busybox image
# See: https://stackoverflow.com/a/71756170
COPY --from=busybox:1.37.0-uclibc /bin/sh /bin/sh
