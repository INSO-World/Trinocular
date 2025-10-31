FROM busybox:musl AS busybox

FROM fluent/fluent-bit:latest

# Manually "install" a shell by copying it from the busybox image
# See: https://stackoverflow.com/a/71756170
# Kaniko is weird and already has some stuff in the /bin directory
COPY --from=busybox /bin/busybox /bin/busybox
RUN ["/bin/busybox", "ln", "-sf", "/bin/busybox", "/bin/sh"]

# Add more busybox symlinks for needed utilities
RUN /bin/busybox ln -sf /bin/busybox /bin/cat     && \
    /bin/busybox ln -sf /bin/busybox /bin/sleep   && \
    /bin/busybox ln -sf /bin/busybox /bin/wget    && \
    /bin/busybox ln -sf /bin/busybox /usr/bin/nc

