/**
 * A command run through `sh -c` with its virtual memory capped by ulimit (the
 * problem's limit plus headroom for the runtime itself), and optionally a
 * bigger stack, then exec'd so signals and exit codes are the program's own.
 */
export function underUlimit(command: string, memoryMb: number, headroomMb: number, stackKb?: number): string[] {
  const steps = [
    ...(stackKb ? [`ulimit -s ${stackKb} 2>/dev/null`] : []),
    `ulimit -v ${(memoryMb + headroomMb) * 1024}`,
    `exec ${command}`,
  ];
  return ["sh", "-c", steps.join("; ")];
}
