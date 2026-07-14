import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminUser = process.env.SEED_ADMIN_USERNAME || "admin";
  const adminPass = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

  // Wipe in dependency order for repeatable seeding.
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.waypoint.deleteMany();
  await prisma.mapObject.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.mapMarking.deleteMany();
  await prisma.drone.deleteMany();
  await prisma.user.deleteMany();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ---- Users ---------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      username: adminUser,
      password: hash(adminPass),
      role: "ADMIN",
      approvalStatus: "APPROVED",
      fullName: "Col. A. Sharma",
      armyNumber: "IC-10023",
      rank: "Colonel",
      unit: "HQ Aviation Command",
      email: "admin@dronecommand.mil",
    },
  });

  const operator1 = await prisma.user.create({
    data: {
      username: "operator1",
      password: hash("Operator@123"),
      role: "OPERATOR",
      approvalStatus: "APPROVED",
      fullName: "Maj. R. Verma",
      armyNumber: "IC-20544",
      rank: "Major",
      unit: "5 Aviation Squadron",
      email: "verma@dronecommand.mil",
    },
  });

  await prisma.user.create({
    data: {
      username: "operator2",
      password: hash("Operator@123"),
      role: "OPERATOR",
      approvalStatus: "PENDING",
      fullName: "Capt. S. Nair",
      armyNumber: "IC-30871",
      rank: "Captain",
      unit: "12 Recon Wing",
      email: "nair@dronecommand.mil",
    },
  });

  await prisma.user.create({
    data: {
      username: "viewer1",
      password: hash("Viewer@123"),
      role: "VIEWER",
      approvalStatus: "APPROVED",
      fullName: "Lt. P. Kaur",
      armyNumber: "IC-40219",
      rank: "Lieutenant",
      unit: "Intelligence Cell",
      email: "kaur@dronecommand.mil",
    },
  });

  // ---- Drones --------------------------------------------------------------
  const droneSeed = [
    { droneId: "DRN-001", name: "Falcon-1", type: "Fixed Wing", frequency: "2.4 GHz", unit: "5 Aviation Squadron", latitude: 28.6139, longitude: 77.209, status: "ACTIVE" },
    { droneId: "DRN-002", name: "Raven-2", type: "Quadcopter", frequency: "5.8 GHz", unit: "12 Recon Wing", latitude: 19.076, longitude: 72.8777, status: "STANDBY" },
    { droneId: "DRN-003", name: "Vulture-3", type: "VTOL", frequency: "900 MHz", unit: "5 Aviation Squadron", latitude: 13.0827, longitude: 80.2707, status: "MAINTENANCE" },
    { droneId: "DRN-004", name: "Osprey-4", type: "Fixed Wing", frequency: "2.4 GHz", unit: "HQ Aviation Command", latitude: 22.5726, longitude: 88.3639, status: "ACTIVE" },
    { droneId: "DRN-005", name: "Kestrel-5", type: "Quadcopter", frequency: "5.8 GHz", unit: "12 Recon Wing", latitude: 26.9124, longitude: 75.7873, status: "STANDBY" },
    { droneId: "DRN-006", name: "Harrier-6", type: "VTOL", frequency: "1.2 GHz", unit: "HQ Aviation Command", latitude: 17.385, longitude: 78.4867, status: "ACTIVE" },
  ];
  const drones = [];
  for (let i = 0; i < droneSeed.length; i++) {
    // First two drones are owned by operator1 (so operator-delete-own can be tested).
    const createdById = i < 2 ? operator1.id : admin.id;
    drones.push(await prisma.drone.create({ data: { ...droneSeed[i], createdById } }));
  }

  // ---- Missions ------------------------------------------------------------
  const mission1 = await prisma.mission.create({
    data: {
      missionName: "Perimeter Recon Alpha",
      missionCode: "MSN-2026-001",
      description: "Routine perimeter surveillance of northern sector.",
      unit: "5 Aviation Squadron",
      droneId: drones[0].id,
      missionStatus: "ACTIVE",
      approvalStatus: "APPROVED",
      adcNumber: "ADC-2026-0001",
      notes: "Maintain altitude above 120m near the ridge line.",
      startTime: new Date("2026-07-14T06:00:00Z"),
      endTime: new Date("2026-07-14T09:00:00Z"),
      createdById: operator1.id,
      approvedById: admin.id,
      approvedAt: new Date("2026-07-13T14:00:00Z"),
      waypoints: {
        create: [
          { sequence: 1, latitude: 28.6139, longitude: 77.209, altitude: 120, speed: 12, hoverTime: 0 },
          { sequence: 2, latitude: 28.64, longitude: 77.23, altitude: 150, speed: 14, hoverTime: 30 },
          { sequence: 3, latitude: 28.66, longitude: 77.25, altitude: 150, speed: 14, hoverTime: 60 },
          { sequence: 4, latitude: 28.63, longitude: 77.27, altitude: 120, speed: 12, hoverTime: 0 },
        ],
      },
    },
  });

  await prisma.mission.create({
    data: {
      missionName: "Coastal Watch Bravo",
      missionCode: "MSN-2026-002",
      description: "Coastal monitoring sweep, western approach.",
      unit: "12 Recon Wing",
      droneId: drones[1].id,
      missionStatus: "PLANNED",
      approvalStatus: "PENDING",
      notes: "Awaiting weather clearance.",
      startTime: new Date("2026-07-16T05:30:00Z"),
      endTime: new Date("2026-07-16T08:00:00Z"),
      createdById: operator1.id,
      waypoints: {
        create: [
          { sequence: 1, latitude: 19.076, longitude: 72.8777, altitude: 100, speed: 10, hoverTime: 0 },
          { sequence: 2, latitude: 19.1, longitude: 72.9, altitude: 130, speed: 12, hoverTime: 45 },
          { sequence: 3, latitude: 19.12, longitude: 72.86, altitude: 130, speed: 12, hoverTime: 0 },
        ],
      },
    },
  });

  await prisma.mission.create({
    data: {
      missionName: "Border Survey Charlie",
      missionCode: "MSN-2026-003",
      description: "High-altitude border survey.",
      unit: "HQ Aviation Command",
      droneId: drones[3].id,
      missionStatus: "COMPLETED",
      approvalStatus: "APPROVED",
      adcNumber: "ADC-2026-0002",
      startTime: new Date("2026-07-10T04:00:00Z"),
      endTime: new Date("2026-07-10T07:00:00Z"),
      createdById: operator1.id,
      approvedById: admin.id,
      approvedAt: new Date("2026-07-09T10:00:00Z"),
    },
  });

  // ---- Map Markings --------------------------------------------------------
  await prisma.mapMarking.createMany({
    data: [
      {
        name: "Restricted Airspace R-42",
        shapeType: "polygon",
        category: "NO_FLY",
        color: "#ef4444",
        notes: "Permanent restricted military airspace. No overflight permitted.",
        createdById: admin.id,
        coordinates: JSON.stringify([
          [28.7, 77.1],
          [28.7, 77.2],
          [28.62, 77.2],
          [28.62, 77.1],
        ]),
      },
      {
        name: "Coastal Restricted Zone",
        shapeType: "circle",
        category: "RESTRICTED",
        color: "#f59e0b",
        notes: "Restricted flight — clearance required within 20 km.",
        createdById: admin.id,
        coordinates: JSON.stringify([[19.076, 72.8777, 20000]]),
      },
      {
        name: "Patrol Route Alpha",
        shapeType: "line",
        category: "CUSTOM",
        color: "#38bdf8",
        notes: "Standard southern patrol corridor.",
        createdById: operator1.id,
        coordinates: JSON.stringify([
          [13.08, 80.27],
          [13.15, 80.3],
          [13.2, 80.25],
        ]),
      },
    ],
  });

  // ---- Notifications -------------------------------------------------------
  // recipientRole "ADMIN" => visible only to admins; null => broadcast to everyone.
  await prisma.notification.createMany({
    data: [
      // Viewer-visible: mission status + new drones/missions.
      { title: "Mission Approved", message: "MSN-2026-001 approved and ADC-2026-0001 assigned.", type: "SUCCESS", audience: "ADMIN,OPERATOR,VIEWER" },
      { title: "Mission Completed", message: "MSN-2026-003 completed successfully.", type: "SUCCESS", audience: "ADMIN,OPERATOR,VIEWER" },
      // Drone added by an operator: admins + viewers see it, other operators do not.
      { title: "Drone Added", message: "Raven-2 added to the fleet by Maj. R. Verma.", type: "INFO", audience: "ADMIN,VIEWER" },
      // Admin-only: user registration (not shown to operators or viewers).
      { title: "User Registered", message: "Capt. S. Nair registered and awaits approval.", type: "INFO", audience: "ADMIN" },
    ],
  });

  // ---- Messages ------------------------------------------------------------
  await prisma.message.createMany({
    data: [
      { senderId: admin.id, senderName: admin.fullName, recipientId: null, body: "All units: submit mission plans for next week by Friday 1800h." },
      { senderId: admin.id, senderName: admin.fullName, recipientId: operator1.id, body: "Maj. Verma, please prioritise the coastal sweep." },
      { senderId: operator1.id, senderName: operator1.fullName, recipientId: admin.id, body: "Acknowledged, sir. Plan will be ready by tomorrow." },
    ],
  });

  // ---- Audit Log -----------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      { action: "DRONE_ADDED", detail: "Falcon-1 (DRN-001) added to fleet.", userId: admin.id, actorName: admin.fullName },
      { action: "MISSION_CREATED", detail: "Perimeter Recon Alpha created.", userId: operator1.id, actorName: operator1.fullName },
      { action: "FLIGHT_APPROVED", detail: "MSN-2026-001 approved, ADC-2026-0001 generated.", userId: admin.id, actorName: admin.fullName },
      { action: "USER_REGISTERED", detail: "Capt. S. Nair submitted a registration request.", actorName: "Capt. S. Nair" },
      { action: "DRONE_STATUS_CHANGED", detail: "Vulture-3 → MAINTENANCE.", userId: admin.id, actorName: admin.fullName },
    ],
  });

  console.log("Seed complete.");
  console.log(`  Admin login:    ${adminUser} / ${adminPass}`);
  console.log("  Operator login: operator1 / Operator@123");
  console.log("  Viewer login:   viewer1 / Viewer@123");
  console.log(`  Missions: ${mission1.missionCode} + 2 more | Drones: ${drones.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
