import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { Role, SubscriptionStatus, PlanTier } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Garantir que existe uma empresa para vincular o superadmin
    let company = await prisma.company.findUnique({
      where: { slug: "arena-central" }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: "Arena Central",
          slug: "arena-central",
          email: "contato@arena.com.br",
          phone: "11999999999",
          address: "Rua Principal, 123",
          city: "São Paulo",
          state: "SP",
          cnpj: "00.000.000/0001-00",
          openingTime: "08:00",
          closingTime: "23:00",
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          planStatus: SubscriptionStatus.ACTIVE
        }
      });
    }

    // 2. Criar ou atualizar o SuperAdmin
    const passwordHash = await hashPassword("Admin@123");
    
    const superAdmin = await prisma.user.upsert({
      where: { email: "super@minhaquadra.com.br" },
      update: {
        role: Role.SUPERADMIN,
        isActive: true,
        passwordHash
      },
      create: {
        email: "super@minhaquadra.com.br",
        name: "Super Admin MQ",
        passwordHash,
        role: Role.SUPERADMIN,
        isActive: true,
        companyId: company.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "SuperAdmin configurado com sucesso!",
      user: superAdmin.email 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
