export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:8501"

export const MISSION = {
  college: "K J Somaiya School of Engineering",
  course: "DS Mini Project · SY B.Tech IT",
  useCase: "KJS-SRS-01",
  useCaseTitle:
    "SomaiyaSat & SomaiyaPod: A PocketQube Mission featuring Autonomous " +
    "AI-Based Inter-Satellite Data Routing and Advanced Multi-Mode Amateur " +
    "Radio Payloads (M17, Codec2, SSTV & TT&C / Housekeeping)",
  vertical: "Space Technology and Remote Sensing",
  collaborator: "ReOrbit, Finland",
  beneficiaries: "Global amateur radio (HAM) community",
  faculty: [
    {
      name: "Dr. Umesh Shinde",
      role: "Associate Professor, Basic Science & Humanities",
      institute: "K J Somaiya Institute of Technology",
    },
    {
      name: "Dr. Shailesh Nikam",
      role: "Professor, Mechanical Engineering",
      institute: "K J Somaiya School of Engineering",
    },
  ],
} as const

export const SAT_DIMENSIONS = {
  length: 127.4,
  width: 57.9,
  height: 57.2,
  pcbThickness: 1.6,
  solarCell: { length: 42.25, width: 22.95 },
  standoffWidth: 5.3,
} as const
