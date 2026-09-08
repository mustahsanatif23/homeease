/**
 * HomeEase seed — deterministic demo data.
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/* deterministic RNG so every demo run looks identical */
let seed = 20260101;
const rand = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p) => rand() < p;

const AREAS = [
  { name: "Dhanmondi", latitude: 23.7461, longitude: 90.3742 },
  { name: "Gulshan", latitude: 23.7925, longitude: 90.4078 },
  { name: "Banani", latitude: 23.7936, longitude: 90.4005 },
  { name: "Uttara", latitude: 23.8759, longitude: 90.3795 },
  { name: "Mirpur", latitude: 23.8223, longitude: 90.3654 },
  { name: "Mohammadpur", latitude: 23.7654, longitude: 90.3589 },
  { name: "Bashundhara", latitude: 23.8203, longitude: 90.4265 },
  { name: "Badda", latitude: 23.7806, longitude: 90.4256 },
  { name: "Farmgate", latitude: 23.7583, longitude: 90.3896 },
  { name: "Motijheel", latitude: 23.7330, longitude: 90.4172 },
];

const CATEGORIES = [
  { name: "Appliance & Gadget Repair", icon: "🔧", description: "Fix ACs, fridges, washing machines, TVs and everyday electronics." },
  { name: "Plumbing", icon: "🚿", description: "Leaks, blockages, fittings and everything water-related." },
  { name: "Electrical", icon: "💡", description: "Wiring, switchboards, fans, lights and safety checks." },
  { name: "Cleaning & Pest Control", icon: "🧽", description: "Deep cleaning, sofa shampoo and pest treatment." },
  { name: "Home Maintenance", icon: "🛠️", description: "Painting, carpentry, tiles and general handyman work." },
  { name: "Moving & Shifting", icon: "📦", description: "Home and office shifting with packing support." },
  { name: "Car Care & Repair", icon: "🚗", description: "Servicing, battery, tyres and car air-conditioning." },
  { name: "Personal Care", icon: "💇", description: "Salon, grooming and wellness services at home." },
];

const SERVICES = [
  ["Appliance & Gadget Repair", "AC Repair", 1200, 90, "Cooling problems, gas refill, noise and servicing."],
  ["Appliance & Gadget Repair", "AC Installation", 2200, 150, "Split or window AC mounting with pipework."],
  ["Appliance & Gadget Repair", "Refrigerator Repair", 1100, 90, "Cooling failures, compressor and thermostat faults."],
  ["Appliance & Gadget Repair", "Washing Machine Repair", 950, 75, "Drainage, spin, drum and control board issues."],
  ["Appliance & Gadget Repair", "TV Repair", 1000, 60, "Display, sound, panel and smart TV software issues."],
  ["Appliance & Gadget Repair", "Microwave Repair", 800, 60, "Heating faults, sparking and turntable problems."],
  ["Appliance & Gadget Repair", "Laptop Servicing", 1500, 90, "Cleaning, thermal paste, OS and hardware checks."],
  ["Plumbing", "Pipe Repair", 700, 60, "Burst, cracked or leaking pipes repaired on site."],
  ["Plumbing", "Drain Cleaning", 850, 60, "Kitchen, bathroom and outdoor drain unblocking."],
  ["Plumbing", "Water Leakage Fix", 900, 75, "Trace and seal hidden leaks and seepage."],
  ["Plumbing", "Geyser Installation", 1400, 90, "Water heater fitting and safety testing."],
  ["Plumbing", "Basin & Commode Fitting", 1200, 90, "Sanitary ware installation and replacement."],
  ["Electrical", "Electrical Wiring", 1600, 120, "New wiring, rewiring and load balancing."],
  ["Electrical", "Fan Installation", 500, 45, "Ceiling, wall and exhaust fan fitting."],
  ["Electrical", "Light Installation", 450, 45, "Lights, chandeliers and LED panel setup."],
  ["Electrical", "Switchboard Repair", 700, 60, "Sockets, switches and MCB replacement."],
  ["Electrical", "Inverter & IPS Service", 1300, 90, "Battery checks, wiring and backup tuning."],
  ["Cleaning & Pest Control", "Deep Home Cleaning", 3000, 240, "Full-home cleaning with kitchen and bathrooms."],
  ["Cleaning & Pest Control", "Bathroom Cleaning", 900, 90, "Descaling, sanitising and tile scrubbing."],
  ["Cleaning & Pest Control", "Kitchen Cleaning", 1200, 120, "Degreasing, chimney and cabinet cleaning."],
  ["Cleaning & Pest Control", "Sofa & Carpet Shampoo", 1500, 120, "Machine shampoo and stain treatment."],
  ["Cleaning & Pest Control", "Pest Control", 2000, 120, "Cockroach, ant and mosquito treatment."],
  ["Cleaning & Pest Control", "Termite Treatment", 3500, 180, "Anti-termite chemical treatment with warranty."],
  ["Home Maintenance", "Interior Painting", 5000, 480, "Room painting including putty and primer."],
  ["Home Maintenance", "Furniture Repair", 1200, 120, "Hinges, polish, joints and upholstery fixes."],
  ["Home Maintenance", "Carpentry Work", 1400, 120, "Doors, shelves, wardrobes and fittings."],
  ["Home Maintenance", "Tiles & Masonry", 2500, 240, "Tile replacement, grouting and small masonry."],
  ["Home Maintenance", "CCTV Installation", 3200, 180, "Camera mounting, DVR setup and app access."],
  ["Moving & Shifting", "Home Shifting", 6000, 360, "Packing, loading, transport and unloading."],
  ["Moving & Shifting", "Office Shifting", 9000, 480, "Workstation, IT and document relocation."],
  ["Moving & Shifting", "Single Item Moving", 1800, 120, "Fridge, sofa or wardrobe moved safely."],
  ["Car Care & Repair", "Car Servicing", 3500, 180, "Oil, filters, fluids and full inspection."],
  ["Car Care & Repair", "Battery Service", 1200, 45, "Testing, jump start and battery replacement."],
  ["Car Care & Repair", "Tyre Service", 900, 60, "Puncture repair, rotation and pressure check."],
  ["Car Care & Repair", "Car AC Service", 2200, 120, "Gas refill, filter cleaning and cooling check."],
  ["Personal Care", "Home Salon (Women)", 1500, 120, "Facial, threading, waxing and hair care at home."],
  ["Personal Care", "Men's Haircut & Grooming", 600, 45, "Haircut, beard shaping and styling."],
  ["Personal Care", "Relaxation Massage", 1800, 90, "Full body relaxation massage at home."],
];

const FIRST = ["Arif", "Nusrat", "Rakib", "Tanvir", "Sadia", "Mahin", "Farhana", "Imran", "Sabbir", "Rumana", "Jubayer", "Sharmin", "Nayeem", "Tasnim", "Shakib", "Mitu", "Riyad", "Anika", "Fahim", "Sumaiya", "Hasan", "Nabila", "Rasel", "Priya", "Sohel", "Lamia", "Zahid", "Ruma", "Sifat", "Mim", "Tanim", "Jarin"];
const LAST = ["Hossain", "Rahman", "Islam", "Ahmed", "Chowdhury", "Karim", "Sultana", "Alam", "Haque", "Siddique", "Bhuiyan", "Mia", "Sarker", "Kabir"];
const BUSINESS_SUFFIX = ["Home Services", "Care Experts", "Fix Point", "Service Hub", "Pro Solutions", "Tech Care", "Quick Fix", "Trusted Services", "Smart Repair", "City Care"];

const COMMENTS = [
  "Arrived on time and finished quickly. Very professional.",
  "Explained the problem clearly before starting. Good work.",
  "Neat, polite and cleaned up afterwards. Recommended.",
  "Solved an issue two other technicians could not.",
  "Fair price and honest advice. Will book again.",
  "Slightly late but the work quality made up for it.",
  "Very good service overall, happy with the result.",
  "Friendly and efficient. The app tracking was handy.",
];

const dateOnly = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const slug = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const toMinutes = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

async function reset() {
  // Order matters because of foreign keys.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.message.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.requestProviderMatch.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.favoriteProvider.deleteMany();
  await prisma.savedAddress.deleteMany();
  await prisma.providerTimeOff.deleteMany();
  await prisma.providerAvailability.deleteMany();
  await prisma.providerService.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.matchingConfiguration.deleteMany();
}

async function main() {
  console.log("Seeding HomeEase…");
  await reset();

  const passwordHash = await bcrypt.hash("Password123", 10);

  await prisma.matchingConfiguration.create({ data: { id: "default" } });

  /* categories + services */
  const categoryMap = new Map();
  for (const c of CATEGORIES) {
    const created = await prisma.serviceCategory.create({
      data: { name: c.name, slug: slug(c.name), description: c.description, icon: c.icon, active: true },
    });
    categoryMap.set(c.name, created);
  }

  const services = [];
  for (const [categoryName, name, basePrice, duration, description] of SERVICES) {
    services.push(
      await prisma.service.create({
        data: {
          categoryId: categoryMap.get(categoryName).id,
          name, slug: slug(name), description,
          basePrice, estimatedDuration: duration, active: true,
        },
      }),
    );
  }
  console.log(`  ${CATEGORIES.length} categories, ${services.length} services`);

  /* demo + generated users */
  const makeAvailability = () =>
    Array.from({ length: 7 }, (_, day) => ({
      dayOfWeek: day,
      startTime: chance(0.3) ? "08:00" : "09:00",
      endTime: chance(0.3) ? "20:00" : "18:00",
      isAvailable: day !== 5, // Friday off
    }));

  await prisma.user.create({
    data: {
      name: "HomeEase Admin", email: "admin@homeease.demo", phone: "+8801700000001",
      passwordHash, role: "ADMIN", accountStatus: "ACTIVE",
      address: "HomeEase HQ, Gulshan 1", area: "Gulshan",
      latitude: 23.7925, longitude: 90.4078, emailVerifiedAt: new Date(),
    },
  });

  const customers = [];
  const demoCustomer = await prisma.user.create({
    data: {
      name: "Ayesha Karim", email: "customer@homeease.demo", phone: "+8801700000002",
      passwordHash, role: "CUSTOMER", accountStatus: "ACTIVE",
      address: "House 42, Road 9/A, Dhanmondi", area: "Dhanmondi",
      latitude: 23.7461, longitude: 90.3742, emailVerifiedAt: new Date(),
      customerProfile: { create: {} },
      savedAddresses: {
        create: [
          { label: "Home", address: "House 42, Road 9/A, Dhanmondi", area: "Dhanmondi", latitude: 23.7461, longitude: 90.3742, isDefault: true },
          { label: "Office", address: "Level 6, Bay Tower, Gulshan 1", area: "Gulshan", latitude: 23.7925, longitude: 90.4078, isDefault: false },
        ],
      },
    },
  });
  customers.push(demoCustomer);

  for (let i = 0; i < 30; i += 1) {
    const area = AREAS[i % AREAS.length];
    const name = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
    customers.push(
      await prisma.user.create({
        data: {
          name, email: `customer${i + 1}@homeease.demo`, phone: `+88017${String(10000000 + i).slice(0, 8)}`,
          passwordHash, role: "CUSTOMER", accountStatus: "ACTIVE",
          address: `House ${int(1, 90)}, Road ${int(1, 20)}, ${area.name}`, area: area.name,
          latitude: area.latitude + (rand() - 0.5) * 0.01,
          longitude: area.longitude + (rand() - 0.5) * 0.01,
          emailVerifiedAt: new Date(),
          customerProfile: { create: {} },
        },
      }),
    );
  }

  /* providers */
  const providers = [];
  const acRepair = services.find((s) => s.name === "AC Repair");

  const buildServices = (list, level) =>
    list.map((s) => ({
      serviceId: s.id,
      price: Math.round((s.basePrice * (0.85 + rand() * 0.4)) / 10) * 10,
      experienceYears: int(1, 12),
      expertiseLevel: level ?? pick(["INTERMEDIATE", "ADVANCED", "EXPERT", "ADVANCED"]),
    }));

  const demoProviderServices = [
    acRepair,
    services.find((s) => s.name === "AC Installation"),
    services.find((s) => s.name === "Refrigerator Repair"),
    services.find((s) => s.name === "Washing Machine Repair"),
  ];

  const demoProviderUser = await prisma.user.create({
    data: {
      name: "Rakib Hossain", email: "provider@homeease.demo", phone: "+8801700000003",
      passwordHash, role: "PROVIDER", accountStatus: "ACTIVE",
      address: "Road 27, Dhanmondi", area: "Dhanmondi",
      latitude: 23.7489, longitude: 90.3721, emailVerifiedAt: new Date(),
      providerProfile: {
        create: {
          businessName: "CoolCare AC Experts",
          bio: "Ten years of air-conditioning and appliance work across Dhaka. Same-day service for urgent cooling failures.",
          experienceYears: 10, serviceRadiusKm: 18,
          verificationStatus: "APPROVED", verifiedAt: new Date(),
          rating: 4.8, ratingCount: 42, completedJobs: 150, acceptedCount: 160, offeredCount: 180,
          totalEarnings: 210000,
          services: { create: buildServices(demoProviderServices, "EXPERT") },
          availability: {
            create: Array.from({ length: 7 }, (_, day) => ({
              dayOfWeek: day, startTime: "08:00", endTime: "20:00", isAvailable: true,
            })),
          },
        },
      },
    },
    include: { providerProfile: true },
  });
  providers.push(demoProviderUser);

  const statuses = ["APPROVED", "APPROVED", "APPROVED", "APPROVED", "APPROVED", "PENDING", "REJECTED", "SUSPENDED"];
  for (let i = 0; i < 24; i += 1) {
    const area = AREAS[i % AREAS.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    const categoryServices = services.filter((s) => s.categoryId === categoryMap.get(category.name).id);
    const offered = categoryServices.slice(0, int(2, Math.min(4, categoryServices.length)));
    const extra = pick(services);
    const verificationStatus = i < 18 ? "APPROVED" : statuses[i % statuses.length];
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const ratingCount = verificationStatus === "APPROVED" ? int(4, 60) : 0;

    const user = await prisma.user.create({
      data: {
        name, email: `provider${i + 1}@homeease.demo`, phone: `+88018${String(20000000 + i).slice(0, 8)}`,
        passwordHash, role: "PROVIDER",
        accountStatus: verificationStatus === "APPROVED" ? "ACTIVE" : verificationStatus === "SUSPENDED" ? "SUSPENDED" : "PENDING",
        address: `Shop ${int(1, 40)}, ${area.name}`, area: area.name,
        latitude: area.latitude + (rand() - 0.5) * 0.02,
        longitude: area.longitude + (rand() - 0.5) * 0.02,
        emailVerifiedAt: new Date(),
        providerProfile: {
          create: {
            businessName: `${name.split(" ")[0]} ${pick(BUSINESS_SUFFIX)}`,
            bio: `${category.name} specialists serving ${area.name} and nearby areas.`,
            experienceYears: int(1, 15),
            serviceRadiusKm: [8, 10, 12, 15, 20][i % 5],
            verificationStatus,
            verifiedAt: verificationStatus === "APPROVED" ? new Date() : null,
            rating: ratingCount ? Math.round((3.6 + rand() * 1.4) * 10) / 10 : 0,
            ratingCount,
            completedJobs: verificationStatus === "APPROVED" ? int(5, 180) : 0,
            acceptedCount: int(10, 140), offeredCount: int(20, 170),
            totalEarnings: verificationStatus === "APPROVED" ? int(20000, 400000) : 0,
            services: { create: buildServices([...offered, ...(offered.includes(extra) ? [] : [extra])]) },
            availability: { create: makeAvailability() },
          },
        },
      },
      include: { providerProfile: true },
    });
    providers.push(user);
  }
  console.log(`  ${customers.length} customers, ${providers.length} providers`);

  /* make sure several approved providers cover AC Repair in Dhanmondi for the demo flow */
  const approved = providers.filter((p) => p.providerProfile.verificationStatus === "APPROVED");
  for (const p of approved.slice(1, 7)) {
    await prisma.providerService.upsert({
      where: { providerId_serviceId: { providerId: p.providerProfile.id, serviceId: acRepair.id } },
      create: {
        providerId: p.providerProfile.id, serviceId: acRepair.id,
        price: Math.round((acRepair.basePrice * (0.85 + rand() * 0.4)) / 10) * 10,
        experienceYears: int(2, 12), expertiseLevel: pick(["INTERMEDIATE", "ADVANCED", "EXPERT"]),
      },
      update: {},
    });
    await prisma.providerProfile.update({
      where: { id: p.providerProfile.id },
      data: { serviceRadiusKm: Math.max(p.providerProfile.serviceRadiusKm, 15) },
    });
  }

  /* time off */
  const today = dateOnly(new Date());
  for (const p of approved.slice(0, 6)) {
    await prisma.providerTimeOff.create({
      data: {
        providerId: p.providerProfile.id,
        date: addDays(today, int(3, 20)),
        startTime: "00:00", endTime: "23:59",
        reason: pick(["Family event", "Medical appointment", "Training day", "Personal leave"]),
      },
    });
  }

  /* favourites */
  for (const p of approved.slice(0, 4)) {
    await prisma.favoriteProvider.create({
      data: { customerId: demoCustomer.id, providerId: p.providerProfile.id },
    });
  }

  /* requests, bookings, invoices, reviews */
  const usedSlots = new Set();
  const providerServiceRows = await prisma.providerService.findMany();
  const byService = new Map();
  for (const row of providerServiceRows) {
    if (!byService.has(row.serviceId)) byService.set(row.serviceId, []);
    byService.get(row.serviceId).push(row);
  }
  const approvedIds = new Set(approved.map((p) => p.providerProfile.id));
  const providerById = new Map(providers.map((p) => [p.providerProfile.id, p]));

  let invoiceSeq = 0;
  let requestCount = 0;
  let bookingCount = 0;

  for (let i = 0; i < 120; i += 1) {
    const customer = customers[i % customers.length];
    const service = pick(services);
    const offers = (byService.get(service.id) ?? []).filter((o) => approvedIds.has(o.providerId));
    const area = AREAS[i % AREAS.length];
    const daysAgo = int(-10, 45); // negative = future
    const created = addDays(new Date(), -daysAgo);
    const scheduled = dateOnly(addDays(created, int(0, 3)));
    const startTime = toHHMM(int(18, 34) * 30); // 09:00 – 17:00
    const endTime = toHHMM(toMinutes(startTime) + service.estimatedDuration);
    const urgency = chance(0.12) ? "URGENT" : chance(0.2) ? "HIGH" : "NORMAL";

    const request = await prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        serviceId: service.id,
        title: `${service.name} needed in ${area.name}`,
        description: `${service.description} Please bring the required parts and tools.`,
        address: `House ${int(1, 90)}, Road ${int(1, 20)}, ${area.name}`,
        area: area.name,
        latitude: area.latitude + (rand() - 0.5) * 0.01,
        longitude: area.longitude + (rand() - 0.5) * 0.01,
        preferredDate: scheduled,
        preferredStartTime: startTime,
        preferredEndTime: endTime,
        urgency,
        contactPhone: customer.phone,
        estimatedPrice: service.basePrice,
        status: "PENDING",
        createdAt: created,
      },
    });
    requestCount += 1;

    if (offers.length === 0) continue;
    const offer = pick(offers);
    const slotKey = `${offer.providerId}|${scheduled.toISOString()}|${startTime}`;
    if (usedSlots.has(slotKey)) continue;
    usedSlots.add(slotKey);

    const provider = providerById.get(offer.providerId);
    const isPast = daysAgo > 0;
    const status = isPast
      ? (chance(0.82) ? "COMPLETED" : chance(0.5) ? "CANCELLED" : "REJECTED")
      : pick(["REQUESTED", "ACCEPTED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"]);

    const subtotal = offer.price;
    const serviceFee = Math.round(subtotal * 0.1);
    const urgencyFee = urgency === "URGENT" ? Math.round(subtotal * 0.2) : urgency === "HIGH" ? Math.round(subtotal * 0.1) : 0;
    const distanceFee = int(0, 6) * 20;
    const total = subtotal + serviceFee + urgencyFee + distanceFee;

    const booking = await prisma.booking.create({
      data: {
        requestId: request.id,
        providerId: offer.providerId,
        customerId: customer.id,
        scheduledDate: scheduled,
        startTime, endTime,
        status,
        price: total,
        createdAt: created,
        acceptedAt: ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"].includes(status) ? created : null,
        startedAt: ["IN_PROGRESS", "COMPLETED"].includes(status) ? addDays(created, 0) : null,
        completedAt: status === "COMPLETED" ? new Date(created.getTime() + int(60, 180) * 60000) : null,
        cancelledAt: ["CANCELLED", "REJECTED"].includes(status) ? created : null,
      },
    });
    bookingCount += 1;

    // A chat thread on the bookings a provider has actually taken, so the
    // messaging feature has history to show.
    const providerUserId = providerById.get(offer.providerId)?.id;
    if (providerUserId && ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"].includes(status) && chance(0.55)) {
      const opening = pick([
        "Hi, the problem started this morning. Is the time still okay for you?",
        "Hello — please call when you reach the gate, the bell is not working.",
        "Hi, will you bring the parts with you or should I arrange anything?",
        "Good morning, just confirming you are coming today.",
      ]);
      const reply = pick([
        "Yes, confirmed. I'll bring the tools and spare parts.",
        "Sure, I'll call you when I'm downstairs.",
        "Noted. I'll be there within the scheduled slot.",
        "Thank you for confirming — see you then.",
      ]);
      const base = booking.acceptedAt ?? created;
      await prisma.message.create({
        data: { bookingId: booking.id, senderId: customer.id, body: opening, createdAt: base, readAt: base },
      });
      await prisma.message.create({
        data: {
          bookingId: booking.id, senderId: providerUserId, body: reply,
          createdAt: new Date(base.getTime() + int(4, 40) * 60000),
          readAt: chance(0.7) ? new Date(base.getTime() + 60 * 60000) : null,
        },
      });
      if (chance(0.4)) {
        await prisma.message.create({
          data: {
            bookingId: booking.id, senderId: customer.id,
            body: pick(["Perfect, thank you!", "Great, see you soon.", "That works for me."]),
            createdAt: new Date(base.getTime() + int(45, 90) * 60000),
            readAt: null,
          },
        });
      }
    }

    await prisma.requestProviderMatch.create({
      data: {
        requestId: request.id, providerId: offer.providerId, rank: 1,
        matchScore: Math.round((72 + rand() * 26) * 10) / 10,
        distanceKm: Math.round(rand() * 90) / 10,
        distanceScore: rand(), availabilityScore: 1, ratingScore: rand(),
        priceScore: rand(), expertiseScore: rand(), workloadScore: rand(),
        estimatedPrice: total, estimatedArrivalMinutes: int(10, 45),
        reason: JSON.stringify(["Available at your requested time", "Nearby provider", "Strong rating"]),
      },
    });

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        providerId: offer.providerId,
        status: status === "COMPLETED" ? "COMPLETED" : ["CANCELLED", "REJECTED"].includes(status) ? "CANCELLED" : "BOOKED",
        finalPrice: status === "COMPLETED" ? total : null,
        matchScore: Math.round((72 + rand() * 26) * 10) / 10,
        estimatedPrice: total,
      },
    });

    if (status === "COMPLETED") {
      invoiceSeq += 1;
      const y = created.getFullYear();
      const m = String(created.getMonth() + 1).padStart(2, "0");
      await prisma.invoice.create({
        data: {
          bookingId: booking.id,
          invoiceNumber: `SS-${y}${m}-${String(invoiceSeq).padStart(5, "0")}`,
          subtotal, serviceFee, urgencyFee, distanceFee, discount: 0, total,
          paymentStatus: chance(0.75) ? "PAID" : "UNPAID",
          issuedAt: booking.completedAt ?? created,
          paidAt: chance(0.75) ? booking.completedAt ?? created : null,
        },
      });

      if (chance(0.75)) {
        const rating = chance(0.7) ? 5 : chance(0.7) ? 4 : 3;
        await prisma.review.create({
          data: {
            bookingId: booking.id, customerId: customer.id, providerId: offer.providerId,
            rating,
            qualityRating: rating, professionalismRating: Math.min(5, rating + (chance(0.3) ? 0 : 0)),
            punctualityRating: rating, valueRating: Math.max(1, rating - (chance(0.3) ? 1 : 0)),
            comment: pick(COMMENTS),
            createdAt: booking.completedAt ?? created,
          },
        });
      }

      await prisma.notification.create({
        data: {
          userId: customer.id, type: "SERVICE_COMPLETED",
          title: service.name, message: "Service completed. Your invoice is ready.",
          read: chance(0.6), relatedRequestId: request.id, relatedBookingId: booking.id,
          createdAt: booking.completedAt ?? created,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: provider.id, type: "BOOKING_CREATED",
          title: "New job request", message: `${service.name} in ${area.name}.`,
          read: chance(0.4), relatedRequestId: request.id, relatedBookingId: booking.id,
          createdAt: created,
        },
      });
    }
  }

  /* recalculate provider ratings from the reviews actually created */
  const reviewAgg = await prisma.review.groupBy({ by: ["providerId"], _avg: { rating: true }, _count: { _all: true } });
  for (const row of reviewAgg) {
    await prisma.providerProfile.update({
      where: { id: row.providerId },
      data: { rating: Math.round((row._avg.rating ?? 0) * 100) / 100, ratingCount: row._count._all },
    });
  }

  /* audit trail */
  const admin = await prisma.user.findUnique({ where: { email: "admin@homeease.demo" } });
  const auditActions = [
    ["PROVIDER_APPROVED", "ProviderProfile"], ["USER_CREATED", "User"], ["SERVICE_SAVED", "Service"],
    ["MATCHING_CONFIG_UPDATED", "MatchingConfiguration"], ["USER_SUSPENDED", "User"], ["USER_LOGIN", "User"],
  ];
  for (let i = 0; i < 40; i += 1) {
    const [action, entity] = auditActions[i % auditActions.length];
    await prisma.auditLog.create({
      data: {
        userId: admin.id, action, entity, entityId: null,
        metadata: JSON.stringify({ note: "seeded demo activity" }),
        createdAt: addDays(new Date(), -int(0, 30)),
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: demoCustomer.id, type: "ACCOUNT_ACTIVATED",
      title: "Welcome to HomeEase",
      message: "Book your first service and we'll find the best provider for you.",
    },
  });

  console.log(`  ${requestCount} requests, ${bookingCount} bookings`);
  console.log("\nDemo accounts (password: Password123)");
  console.log("  customer@homeease.demo");
  console.log("  provider@homeease.demo");
  console.log("  admin@homeease.demo");
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
