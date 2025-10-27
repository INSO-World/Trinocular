FROM fluent/fluent-bit:latest

# Manually "install" a shell by copying it from the busybox image
# See: https://stackoverflow.com/a/71756170
# We cannot install to /bin/busybox as kinoko errors out when we use the same 
# source and destination path
COPY --from=busybox:1.37.0-uclibc /bin/busybox /temp/busybox
RUN ["/temp/busybox", "mv", "/temp/busybox", "/bin"]
RUN ["/bin/busybox", "ln", "-s", "/bin/busybox", "/bin/sh"]

# Add more busybox symlinks for needed utilities
RUN /bin/busybox ln -s /bin/busybox /bin/cat && \
    /bin/busybox ln -s /bin/busybox /bin/wget

