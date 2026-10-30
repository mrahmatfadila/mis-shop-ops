const { createClient } = require("@libsql/client");
const path = require("path");

const dbPath = path.resolve(__dirname, "../../shop_ops.db");
const db = createClient({
  url: `file:${dbPath.replace(/\\/g, "/")}`,
});

const spvUsers = [
  { username: "1112040001", name: "YULIA PASTRIA LUBIS", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040004", name: "Mohamad Ahyari", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040012", name: "Widi Astuti", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112060001", name: "Nurhaity", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1113120004", name: "Amalia Nur Halimah", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1117050005", name: "Desna Putri Sari", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1117110004", name: "Neneng Sri Sulastri", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1120090003", name: "Andi Srideviana", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1123030008", name: "Aditya Sugiarta", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040003", name: "SARAH ARIMBI", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040006", name: "SUPRIYANTA", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040007", name: "Sri Satihani", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040008", name: "TETI ROHAYATI", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040010", name: "YUNI WATI", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040011", name: "Andriyanto", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112040015", name: "Carla Sismayani", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112060002", name: "Dewi Lesmaya", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1112110001", name: "Lulun Luniasari", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1113050001", name: "Tetty Hasianty S", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1113060001", name: "Angel Silia Sumarandak", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1115060003", name: "Puspita Dewi Anjani", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1116090001", name: "Puji Septiani", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1116100001", name: "Brando Lengkey", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1116110001", name: "SUSANTHY WULANDARI", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1117010001", name: "Ellyawati", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1117090001", name: "Fernando Simanjuntak", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1117100011", name: "Afisha Listyan Martadifa", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1118090002", name: "Rony Dewi Maratasiahaan", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1118120020", name: "Merry Dewi Safitri", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1119010001", name: "Lintu Budi Setiani", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1120020011", name: "Ferawati Lestari", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1123090005", name: "Selpia Gasela", role: "SPV_PLAZABALI", shop: "Plaza Bali" },
  { username: "1119020030", name: "Ika ChristyaningYuli W", role: "SPV_PLAZABALI", shop: "Plaza Bali" }
];

const itSupportUsers = [
  { username: "8117110002", name: "Zaenal Anwar", role: "MIS", shop: "Semua Toko" },
  { username: "8123040002", name: "Herman Santoso", role: "MIS", shop: "Semua Toko" },
  { username: "8124070002", name: "Muhamad Rahmat Fadila", role: "MIS", shop: "Semua Toko" },
  { username: "8123040001", name: "Ahmad Dimyati", role: "MIS", shop: "Semua Toko" }
];

async function seed() {
  console.log("Seeding users...");

  // Update/Ensure admin user has password 'admin'
  await db.execute({
    sql: `UPDATE users SET password = 'admin' WHERE username = 'admin'`,
    args: []
  });

  // Ensure default dev users exist
  const defaultDevs = [
    { username: "admin", name: "Administrator Sistem", role: "ADMIN", shop: "Semua Toko", pw: "admin" },
    { username: "mis", name: "MIS OPS", role: "MIS", shop: "Semua Toko", pw: "123" },
    { username: "manager", name: "MIS MANAGER", role: "MANAGER", shop: "Semua Toko", pw: "123" },
    { username: "procurement", name: "MIS PROCUREMENT SUPPORT", role: "IT_PROCUREMENT", shop: "Semua Toko", pw: "123" },
    { username: "spv_plazabali", name: "SPV Plaza Bali", role: "SPV_PLAZABALI", shop: "Plaza Bali", pw: "123" },
    { username: "spv_sam", name: "SPV SAM", role: "SPV_SAM", shop: "SAM", pw: "123" },
  ];

  for (const d of defaultDevs) {
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [d.username]
    });
    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE users SET password = ?, name = ?, role = ?, shop_location = ? WHERE username = ?",
        args: [d.pw, d.name, d.role, d.shop, d.username]
      });
    } else {
      await db.execute({
        sql: "INSERT INTO users (username, name, role, shop_location, password) VALUES (?, ?, ?, ?, ?)",
        args: [d.username, d.name, d.role, d.shop, d.pw]
      });
    }
  }

  // Insert or Update SPV users
  for (const u of spvUsers) {
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [u.username]
    });
    // Default password can be their NIK or '123'
    const pw = "123";
    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE users SET name = ?, role = ?, shop_location = ?, password = ? WHERE username = ?",
        args: [u.name, u.role, u.shop, pw, u.username]
      });
    } else {
      await db.execute({
        sql: "INSERT INTO users (username, name, role, shop_location, password) VALUES (?, ?, ?, ?, ?)",
        args: [u.username, u.name, u.role, u.shop, pw]
      });
    }
  }

  // Insert or Update IT Support users
  for (const u of itSupportUsers) {
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE username = ?",
      args: [u.username]
    });
    const pw = "123";
    if (existing.rows.length > 0) {
      await db.execute({
        sql: "UPDATE users SET name = ?, role = ?, shop_location = ?, password = ? WHERE username = ?",
        args: [u.name, u.role, u.shop, pw, u.username]
      });
    } else {
      await db.execute({
        sql: "INSERT INTO users (username, name, role, shop_location, password) VALUES (?, ?, ?, ?, ?)",
        args: [u.username, u.name, u.role, u.shop, pw]
      });
    }
  }

  const countRes = await db.execute("SELECT COUNT(*) as total FROM users");
  console.log(`Success! Total users in database: ${countRes.rows[0].total}`);
}

seed().catch(console.error);

