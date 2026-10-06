import http from 'node:http';

const port = Number(process.env.PORT ?? 4321);
const readerOrigin = process.env.READER_ORIGIN ?? 'http://127.0.0.1:3202';
const consoleOrigin = process.env.CONSOLE_ORIGIN ?? 'http://127.0.0.1:3201';

function forward(request, response) {
  const targetOrigin = request.url?.startsWith('/app') ? consoleOrigin : readerOrigin;
  const target = new URL(request.url ?? '/', targetOrigin);
  const upstream = http.request(
    target,
    { method: request.method, headers: { ...request.headers, host: target.host } },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );
  upstream.on('error', () => {
    response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Local application service is unavailable.');
  });
  request.pipe(upstream);
}

http.createServer(forward).listen(port, '127.0.0.1', () => {
  console.log(`Local gateway listening on http://localhost:${port}`);
});
