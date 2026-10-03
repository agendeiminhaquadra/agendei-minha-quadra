import { PrismaClient, Role, CourtStatus, CustomerStatus, BookingStatus, PaymentStatus, BookingOrigin, PaymentMethod, PaymentTransactionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const SENHA_PADRAO = "Admin@123";

async function main() {
  console.log("🌱 Iniciando seed do banco Minha Quadra...\n");

  console.log("🏢 Criando Empresa (Arena Central)...");
  const empresa = await prisma.company.upsert({
    where: { slug: "arena-central" },
    update: {},
    create: {
      name: "Arena Central",
      slug: "arena-central",
      logo: "/logo.png",
      cnpj: "12.345.678/0001-90",
      email: "contato@arenacentral.com.br",
      phone: "(11) 99999-0000",
      address: "Av. das Quadras, 1500",
      city: "São Paulo",
      state: "SP",
      openingTime: "08:00",
      closingTime: "23:00",
      operatesMondayToFriday: true,
      operatesSaturday: true,
      operatesSunday: false,
      defaultCancellationFeePercent: 30,
      acceptsPix: true,
      acceptsCash: true,
      acceptsCard: true,
    },
  });
  console.log(`✅ Empresa criada: ${empresa.name} (slug: ${empresa.slug})\n`);

  console.log("👤 Criando Usuário Admin (João Duarte)...");
  const hashSenha = await bcrypt.hash(SENHA_PADRAO, SALT_ROUNDS);
  const usuarioAdmin = await prisma.user.upsert({
    where: { email: "admin@arenacentral.com.br" },
    update: { passwordHash: hashSenha },
    create: {
      email: "admin@arenacentral.com.br",
      name: "João Duarte",
      passwordHash: hashSenha,
      phone: "(11) 98765-4321",
      role: Role.ADMIN,
      isActive: true,
      companyId: empresa.id,
    },
  });
  console.log(`✅ Admin criado: ${usuarioAdmin.name} (${usuarioAdmin.email})`);
  console.log(`   🔑 Senha temporária: ${SENHA_PADRAO}\n`);

  console.log("⚽ Criando Modalidades...");
  const modalidadeFutebol = await prisma.modality.upsert({
    where: { id: "mod-futebol" },
    update: {},
    create: {
      id: "mod-futebol",
      name: "Futebol Society",
      color: "#16A34A",
      pricePerHour: 120,
      iconName: "trophy",
      textColorClass: "text-sport-futebol",
      bgColorClass: "bg-sport-futebol",
      borderColorClass: "border-sport-futebol",
      isActive: true,
      companyId: empresa.id,
    },
  });

  const modalidadeVolei = await prisma.modality.upsert({
    where: { id: "mod-volei" },
    update: {},
    create: {
      id: "mod-volei",
      name: "Vôlei",
      color: "#FF8A00",
      pricePerHour: 80,
      iconName: "volleyball",
      textColorClass: "text-sport-volei",
      bgColorClass: "bg-sport-volei",
      borderColorClass: "border-sport-volei",
      isActive: true,
      companyId: empresa.id,
    },
  });

  const modalidadeFutevolei = await prisma.modality.upsert({
    where: { id: "mod-futevolei" },
    update: {},
    create: {
      id: "mod-futevolei",
      name: "Futevôlei",
      color: "#8B5CF6",
      pricePerHour: 70,
      iconName: "sun",
      textColorClass: "text-sport-futevolei",
      bgColorClass: "bg-sport-futevolei",
      borderColorClass: "border-sport-futevolei",
      isActive: true,
      companyId: empresa.id,
    },
  });

  const modalidadeBeachTennis = await prisma.modality.upsert({
    where: { id: "mod-beach-tennis" },
    update: {},
    create: {
      id: "mod-beach-tennis",
      name: "Beach Tennis",
      color: "#F59E0B",
      pricePerHour: 90,
      iconName: "tennis",
      textColorClass: "text-sport-beachTennis",
      bgColorClass: "bg-sport-beachTennis",
      borderColorClass: "border-sport-beachTennis",
      isActive: true,
      companyId: empresa.id,
    },
  });
  console.log(`✅ 4 Modalidades criadas: Futebol Society, Vôlei, Futevôlei, Beach Tennis\n`);

  console.log("🏟️ Criando Quadras...");
  const quadra1 = await prisma.court.upsert({
    where: { id: "court-q01" },
    update: {},
    create: {
      id: "court-q01",
      name: "QUADRA 01",
      modalityId: modalidadeFutebol.id,
      pricePerHour: 120,
      startTime: "08:00",
      endTime: "23:00",
      status: CourtStatus.ACTIVE,
      description: "Quadra de grama sintética oficial, iluminação LED de última geração.",
      capacity: 14,
      isCovered: true,
      hasLighting: true,
      floorType: "Grama Sintética",
      defaultDurationMinutes: 60,
      isActive: true,
      companyId: empresa.id,
    },
  });

  const quadra2 = await prisma.court.upsert({
    where: { id: "court-q02" },
    update: {},
    create: {
      id: "court-q02",
      name: "QUADRA 02",
      modalityId: modalidadeVolei.id,
      pricePerHour: 80,
      startTime: "08:00",
      endTime: "22:00",
      status: CourtStatus.ACTIVE,
      description: "Quadra poliesportiva com rede oficial de vôlei.",
      capacity: 12,
      isCovered: true,
      hasLighting: true,
      floorType: "Poluretano",
      defaultDurationMinutes: 60,
      isActive: true,
      companyId: empresa.id,
    },
  });

  const quadra3 = await prisma.court.upsert({
    where: { id: "court-q03" },
    update: {},
    create: {
      id: "court-q03",
      name: "QUADRA 03",
      modalityId: modalidadeFutevolei.id,
      pricePerHour: 70,
      startTime: "08:00",
      endTime: "22:00",
      status: CourtStatus.ACTIVE,
      description: "Quadra de areia, perfeita para futevôlei e lazer.",
      capacity: 8,
      isCovered: false,
      hasLighting: true,
      floorType: "Areia",
      defaultDurationMinutes: 60,
      isActive: true,
      companyId: empresa.id,
    },
  });

  const quadra4 = await prisma.court.upsert({
    where: { id: "court-q04" },
    update: {},
    create: {
      id: "court-q04",
      name: "QUADRA 04",
      modalityId: modalidadeBeachTennis.id,
      pricePerHour: 90,
      startTime: "08:00",
      endTime: "22:00",
      status: CourtStatus.ACTIVE,
      description: "Quadra profissional de Beach Tennis com superfície especial.",
      capacity: 4,
      isCovered: false,
      hasLighting: true,
      floorType: "Areia Especial",
      defaultDurationMinutes: 60,
      isActive: true,
      companyId: empresa.id,
    },
  });
  console.log(`✅ 4 Quadras criadas: Q01, Q02, Q03, Q04\n`);

  console.log("👥 Criando Clientes...");
  const dadosClientes = [
    { name: "João Paulo Silva", email: "joao.silva@email.com", phone: "(11) 98765-4321", cpf: "123.456.789-00", status: CustomerStatus.ATIVO, isVip: true },
    { name: "Mariana Costa Oliveira", email: "mariana.costa@email.com", phone: "(11) 91234-5678", cpf: "234.567.890-11", status: CustomerStatus.ATIVO, isVip: false },
    { name: "Carlos Eduardo Souza", email: "carlos.souza@email.com", phone: "(11) 99876-5432", cpf: "345.678.901-22", status: CustomerStatus.ATIVO, isVip: true },
    { name: "Ana Beatriz Lima", email: "ana.lima@email.com", phone: "(11) 97654-3210", cpf: "456.789.012-33", status: CustomerStatus.ATIVO, isVip: false },
    { name: "Roberto Ferreira Neto", email: "roberto.ferreira@email.com", phone: "(11) 95432-1098", cpf: "567.890.123-44", status: CustomerStatus.INATIVO, isVip: false },
    { name: "Fernanda Almeida Santos", email: "fernanda.almeida@email.com", phone: "(11) 93210-9876", cpf: "678.901.234-55", status: CustomerStatus.ATIVO, isVip: false },
    { name: "Ricardo Mendes Chagas", email: "ricardo.mendes@email.com", phone: "(11) 91111-2222", cpf: "789.012.345-66", status: CustomerStatus.BLOQUEADO, isVip: false },
    { name: "Patrícia Rocha Vieira", email: "patricia.rocha@email.com", phone: "(11) 94444-5555", cpf: "890.123.456-77", status: CustomerStatus.ATIVO, isVip: true },
  ];

  const clientesCriados: any[] = [];
  for (const cli of dadosClientes) {
    const cliente = await prisma.customer.upsert({
      where: { companyId_email: { companyId: empresa.id, email: cli.email } },
      update: {},
      create: {
        ...cli,
        companyId: empresa.id,
        totalSpent: 0,
        totalBookings: 0,
        attendanceRate: 0,
      },
    });
    clientesCriados.push(cliente);
    console.log(`   🧑 ${cliente.name}`);
  }
  console.log(`✅ ${clientesCriados.length} clientes criados\n`);

  console.log("📅 Criando Agendamentos para hoje...");
  const hoje = new Date();
  const dataFormatada = (hora: number, minuto = 0) => {
    const d = new Date(hoje);
    d.setHours(hora, minuto, 0, 0);
    return d;
  };

  const agendamentosCriar = [
    {
      court: quadra1,
      modalityId: modalidadeFutebol.id,
      customer: clientesCriados[0],
      start: dataFormatada(8),
      end: dataFormatada(9),
      status: BookingStatus.CONFIRMED,
      price: 120,
      paid: true,
      origem: BookingOrigin.WHATSAPP,
    },
    {
      court: quadra3,
      modalityId: modalidadeFutevolei.id,
      customer: clientesCriados[2],
      start: dataFormatada(10),
      end: dataFormatada(11),
      status: BookingStatus.CONFIRMED,
      price: 70,
      paid: true,
      origem: BookingOrigin.ADMIN_PANEL,
    },
    {
      court: quadra1,
      modalityId: modalidadeFutebol.id,
      customer: clientesCriados[1],
      start: dataFormatada(11),
      end: dataFormatada(12),
      status: BookingStatus.PENDING,
      price: 120,
      paid: false,
      origem: BookingOrigin.PUBLIC_ARENA,
    },
    {
      court: quadra4,
      modalityId: modalidadeBeachTennis.id,
      customer: clientesCriados[3],
      start: dataFormatada(14),
      end: dataFormatada(15),
      status: BookingStatus.CONFIRMED,
      price: 90,
      paid: true,
      origem: BookingOrigin.WHATSAPP,
    },
    {
      court: quadra2,
      modalityId: modalidadeVolei.id,
      customer: clientesCriados[5],
      start: dataFormatada(18),
      end: dataFormatada(19),
      status: BookingStatus.PENDING,
      price: 80,
      paid: false,
      origem: BookingOrigin.IN_PERSON,
    },
    {
      court: quadra3,
      modalityId: modalidadeFutevolei.id,
      customer: clientesCriados[7],
      start: dataFormatada(19),
      end: dataFormatada(20),
      status: BookingStatus.CONFIRMED,
      price: 70,
      paid: true,
      origem: BookingOrigin.ADMIN_PANEL,
    },
    {
      court: quadra1,
      modalityId: modalidadeFutebol.id,
      customer: clientesCriados[2],
      start: dataFormatada(20),
      end: dataFormatada(22),
      status: BookingStatus.CONFIRMED,
      price: 240,
      paid: false,
      origem: BookingOrigin.PHONE,
    },
    {
      court: quadra4,
      modalityId: modalidadeBeachTennis.id,
      customer: clientesCriados[0],
      start: dataFormatada(17),
      end: dataFormatada(18),
      status: BookingStatus.CONFIRMED,
      price: 90,
      paid: true,
      origem: BookingOrigin.ADMIN_PANEL,
    },
  ];

  let agendamentosCount = 0;
  for (const a of agendamentosCriar) {
    try {
      const reserva = await prisma.booking.create({
        data: {
          companyId: empresa.id,
          courtId: a.court.id,
          modalityId: a.modalityId,
          customerId: a.customer.id,
          startTime: a.start,
          endTime: a.end,
          durationMinutes: (a.end.getTime() - a.start.getTime()) / 60000,
          status: a.status,
          totalPrice: a.price,
          customerNameSnapshot: a.customer.name,
          customerPhoneSnapshot: a.customer.phone,
          pricePerHourSnapshot: a.court.pricePerHour,
          origin: a.origem,
          paymentStatus: a.paid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
          paidAmount: a.paid ? a.price : 0,
        },
      });

      if (a.paid) {
        await prisma.payment.create({
          data: {
            companyId: empresa.id,
            bookingId: reserva.id,
            customerId: a.customer.id,
            amount: a.price,
            paymentMethod: PaymentMethod.PIX,
            status: PaymentTransactionStatus.PAID,
            paidAt: new Date(),
          },
        });
      }

      agendamentosCount++;
      const hora = a.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      console.log(`   📌 ${a.court.name} | ${hora} | ${a.customer.name} | R$ ${a.price},00`);
    } catch (e: any) {
      if (e.code === "P2002") {
        console.log(`   ⚠️  Agendamento já existente, pulando...`);
      } else {
        console.error("   ❌ Erro:", e.message);
      }
    }
  }
  console.log(`✅ ${agendamentosCount} agendamentos criados para hoje\n`);

  console.log("🧹 Atualizando contadores dos clientes (total gasto, reservas)...");
  for (const cli of clientesCriados) {
    const aggregate = await prisma.booking.aggregate({
      where: { customerId: cli.id, companyId: empresa.id },
      _sum: { totalPrice: true },
      _count: { id: true },
    });
    await prisma.customer.update({
      where: { id: cli.id },
      data: {
        totalSpent: aggregate._sum.totalPrice || 0,
        totalBookings: aggregate._count.id || 0,
        firstBookingAt: (await prisma.booking.findFirst({ where: { customerId: cli.id }, orderBy: { createdAt: "asc" } }))?.createdAt || null,
        lastBookingAt: (await prisma.booking.findFirst({ where: { customerId: cli.id }, orderBy: { createdAt: "desc" } }))?.createdAt || null,
      },
    });
  }
  console.log("✅ Contadores atualizados\n");

  console.log("══════════════════════════════════════════════════");
  console.log("🎉 SEED CONCLUÍDO COM SUCESSO!");
  console.log("══════════════════════════════════════════════════\n");
  console.log("Dados criados:");
  console.log(`  🏢 Empresa: ${empresa.name}`);
  console.log(`  👤 Admin: ${usuarioAdmin.email} / senha: ${SENHA_PADRAO}`);
  console.log(`  ⚽ 4 Modalidades`);
  console.log(`  🏟️ 4 Quadras`);
  console.log(`  👥 ${clientesCriados.length} Clientes`);
  console.log(`  📅 ${agendamentosCount} Agendamentos de hoje`);
  console.log("\n✅ Banco populado e pronto para uso!");
}

main()
  .catch((e) => {
    console.error("\n❌ ERRO NO SEED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
