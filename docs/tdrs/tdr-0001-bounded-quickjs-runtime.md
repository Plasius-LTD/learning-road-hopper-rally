# TDR-0001: Bounded QuickJS runtime

Use `quickjs-emscripten` 0.32.0 in a fresh realm per Run or assessment. Evaluate files in canonical order, pass only JSON-compatible inputs, and expose no host globals. The runtime applies 32 MiB heap, 512 KiB stack, five-second compilation/call deadlines, 16 ms tick deadlines, and a 30-minute session deadline. Hosts must run the evaluator in a disposable browser or Node worker and apply the five-second hard termination deadline independently.
