// Callback type for receiving log lines
export type LogLineCallback = (line: string) => void;
// Callback type for error handling
export type LogErrorCallback = (error: Error) => void;
// Callback type for when stream completes
export type LogCompleteCallback = () => void;

/**
 * Streams build logs from the server.
 * This endpoint uses chunked transfer encoding to stream plain text logs.
 *
 * @param projectId - The project identifier
 * @param containerId - The container identifier
 * @param onLogLine - Callback invoked when a new log line is received
 * @param onError - Callback invoked if an error occurs
 * @param onComplete - Callback invoked when the stream completes
 * @returns A function to cancel the stream
 */
export function streamBuildLogs(
  projectId: string,
  containerId: string,
  onLogLine: LogLineCallback,
  onError: LogErrorCallback,
  onComplete: LogCompleteCallback
): () => void {
  const controller = new AbortController();
  const signal = controller.signal;

  // Create a new fetch request to handle streaming
  fetch(
    `${(import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8080").replace(/\/$/, "")}/api/v1/build/logs/${projectId}/${containerId}`,
    {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Accept: "text/plain"
      },
      signal
    }
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch build logs: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      // Read the stream
      const read = () => {
        reader
          .read()
          .then(({ done, value }) => {
            if (done) {
              // Process any remaining data in the buffer
              if (buffer.trim()) {
                onLogLine(buffer.trim());
              }
              onComplete();
              return;
            }

            // Decode and process the chunk
            buffer += decoder.decode(value, { stream: true });

            // Split buffer into lines
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            lines
              .filter((line) => line.trim())
              .forEach((line) => {
                onLogLine(line.trim());
              });

            read(); // Continue reading
          })
          .catch((error) => {
            // Only report error if it's not an abort error
            if (error.name !== "AbortError") {
              onError(error);
            }
          });
      };

      read();
    })
    .catch((error) => {
      // Only report error if it's not an abort error
      if (error.name !== "AbortError") {
        onError(error);
      }
    });

  // Return a function to cancel the stream
  return () => {
    controller.abort();
  };
}
