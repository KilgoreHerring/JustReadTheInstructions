import { PrismaClient } from "@prisma/client";
import regulatorsData from "../data/seed/regulators.json";
import productTypesData from "../data/seed/product-types.json";
import consumerDutyData from "../data/seed/obligations/consumer-duty-obligations.json";
import psrData from "../data/seed/obligations/psr-2017-obligations.json";
import bcobsData from "../data/seed/obligations/bcobs-obligations.json";
import mcobData from "../data/seed/obligations/mcob-obligations.json";
import concData from "../data/seed/obligations/conc-obligations.json";
import cobsData from "../data/seed/obligations/cobs-obligations.json";
import icobsData from "../data/seed/obligations/icobs-obligations.json";
import dispData from "../data/seed/obligations/disp-obligations.json";
import syscData from "../data/seed/obligations/sysc-obligations.json";
import cassData from "../data/seed/obligations/cass-obligations.json";
import prodData from "../data/seed/obligations/prod-obligations.json";

const prisma = new PrismaClient();

interface SectionData {
  section: { number: string; title: string; level: number };
  rules: {
    reference: string;
    rawText: string;
    obligations: {
      obligationType: string;
      addressee: string;
      actionText: string;
      objectText?: string;
      conditionText?: string;
      summary: string;
      applicableProductTypes: string[];
      relevanceScore: number;
      clauseTemplate?: {
        title: string;
        templateText: string;
        guidance?: string;
      };
    }[];
  }[];
}

async function seedRegulation(
  regulationId: string,
  regulatorId: string,
  title: string,
  citation: string,
  type: string,
  status: string,
  effectiveDate: string,
  url: string,
  sections: SectionData[],
  productTypeMap: Record<string, string>
) {
  const regulation = await prisma.regulation.upsert({
    where: { id: regulationId },
    update: {},
    create: {
      id: regulationId,
      regulatorId,
      title,
      citation,
      type,
      status,
      effectiveDate: new Date(effectiveDate),
      url,
    },
  });
  console.log(`  + ${regulation.title}`);

  let obligationCount = 0;
  let clauseCount = 0;

  for (const sectionData of sections) {
    const section = await prisma.section.create({
      data: {
        regulationId: regulation.id,
        number: sectionData.section.number,
        title: sectionData.section.title,
        level: sectionData.section.level,
      },
    });

    for (const ruleData of sectionData.rules) {
      const rule = await prisma.rule.create({
        data: {
          sectionId: section.id,
          reference: ruleData.reference,
          rawText: ruleData.rawText,
          status: "active",
          effectiveDate: new Date(effectiveDate),
        },
      });

      for (const obData of ruleData.obligations) {
        const obligation = await prisma.obligation.create({
          data: {
            ruleId: rule.id,
            obligationType: obData.obligationType,
            addressee: obData.addressee,
            actionText: obData.actionText,
            objectText: obData.objectText || null,
            conditionText: obData.conditionText || null,
            summary: obData.summary,
            extractedBy: "manual",
            confidenceScore: 1.0,
            verifiedBy: "seed",
            verifiedAt: new Date(),
          },
        });
        obligationCount++;

        for (const ptName of obData.applicableProductTypes) {
          const ptId = productTypeMap[ptName];
          if (ptId) {
            await prisma.obligationProductApplicability.create({
              data: {
                obligationId: obligation.id,
                productTypeId: ptId,
                relevanceScore: obData.relevanceScore,
                rationale: `Mapped via ${title} seed data — applies to ${ptName}`,
              },
            });
          }
        }

        if (obData.clauseTemplate) {
          await prisma.clauseTemplate.create({
            data: {
              obligationId: obligation.id,
              title: obData.clauseTemplate.title,
              templateText: obData.clauseTemplate.templateText,
              guidance: obData.clauseTemplate.guidance || null,
            },
          });
          clauseCount++;
        }
      }
    }

    console.log(
      `    Section ${sectionData.section.number}: ${sectionData.section.title}`
    );
  }

  return { obligationCount, clauseCount };
}

async function main() {
  console.log("Seeding database...\n");

  // 0. Clean up existing seed data (child tables first)
  console.log("Cleaning existing seed data...");
  await prisma.complianceControl.deleteMany();
  await prisma.obligationChange.deleteMany();
  await prisma.clauseTemplate.deleteMany();
  await prisma.complianceMatrixEntry.deleteMany();
  await prisma.obligationProductApplicability.deleteMany();
  await prisma.obligation.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.section.deleteMany();
  console.log("  Done.\n");

  // 1. Create regulators
  console.log("Creating regulators...");
  const regulators: Record<string, string> = {};
  for (const reg of regulatorsData) {
    const created = await prisma.regulator.upsert({
      where: { id: reg.id },
      update: {},
      create: {
        id: reg.id,
        name: reg.name,
        abbreviation: reg.abbreviation,
        jurisdiction: reg.jurisdiction,
        website: reg.website,
      },
    });
    regulators[reg.id] = created.id;
    console.log(`  + ${reg.name}`);
  }

  // 2. Create product types
  console.log("\nCreating product types...");
  const productTypeMap: Record<string, string> = {};
  for (const pt of productTypesData) {
    const created = await prisma.productType.upsert({
      where: { id: pt.id },
      update: {},
      create: {
        id: pt.id,
        name: pt.name,
        category: pt.category,
        description: pt.description,
        attributes: {
          create: pt.attributes.map((a: { key: string; value: string }) => ({
            key: a.key,
            value: a.value,
          })),
        },
      },
    });
    productTypeMap[pt.name] = created.id;
    console.log(`  + ${pt.name}`);
  }

  // 3. Seed all regulations
  let totalObligations = 0;
  let totalClauses = 0;

  // Consumer Duty (legacy format — sections array directly)
  console.log("\nSeeding Consumer Duty...");
  const cd = await seedRegulation(
    "consumer-duty",
    regulators["fca"],
    "Consumer Duty",
    "FCA PS22/9 - PRIN 2A",
    "regulatory_rules",
    "active",
    "2023-07-31",
    "https://www.handbook.fca.org.uk/handbook/PRIN/2A/?view=chapter",
    consumerDutyData as SectionData[],
    productTypeMap
  );
  totalObligations += cd.obligationCount;
  totalClauses += cd.clauseCount;

  // PSR 2017
  console.log("\nSeeding Payment Services Regulations 2017...");
  const psr = await seedRegulation(
    psrData.regulation.id,
    regulators[psrData.regulation.regulatorId],
    psrData.regulation.title,
    psrData.regulation.citation,
    psrData.regulation.type,
    psrData.regulation.status,
    psrData.regulation.effectiveDate,
    psrData.regulation.url,
    psrData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += psr.obligationCount;
  totalClauses += psr.clauseCount;

  // BCOBS
  console.log("\nSeeding BCOBS...");
  const bcobs = await seedRegulation(
    bcobsData.regulation.id,
    regulators[bcobsData.regulation.regulatorId],
    bcobsData.regulation.title,
    bcobsData.regulation.citation,
    bcobsData.regulation.type,
    bcobsData.regulation.status,
    bcobsData.regulation.effectiveDate,
    bcobsData.regulation.url,
    bcobsData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += bcobs.obligationCount;
  totalClauses += bcobs.clauseCount;

  // MCOB
  console.log("\nSeeding MCOB...");
  const mcob = await seedRegulation(
    mcobData.regulation.id,
    regulators[mcobData.regulation.regulatorId],
    mcobData.regulation.title,
    mcobData.regulation.citation,
    mcobData.regulation.type,
    mcobData.regulation.status,
    mcobData.regulation.effectiveDate,
    mcobData.regulation.url,
    mcobData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += mcob.obligationCount;
  totalClauses += mcob.clauseCount;

  // CONC
  console.log("\nSeeding CONC...");
  const conc = await seedRegulation(
    concData.regulation.id,
    regulators[concData.regulation.regulatorId],
    concData.regulation.title,
    concData.regulation.citation,
    concData.regulation.type,
    concData.regulation.status,
    concData.regulation.effectiveDate,
    concData.regulation.url,
    concData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += conc.obligationCount;
  totalClauses += conc.clauseCount;

  // COBS
  console.log("\nSeeding COBS...");
  const cobs = await seedRegulation(
    cobsData.regulation.id,
    regulators[cobsData.regulation.regulatorId],
    cobsData.regulation.title,
    cobsData.regulation.citation,
    cobsData.regulation.type,
    cobsData.regulation.status,
    cobsData.regulation.effectiveDate,
    cobsData.regulation.url,
    cobsData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += cobs.obligationCount;
  totalClauses += cobs.clauseCount;

  // ICOBS
  console.log("\nSeeding ICOBS...");
  const icobs = await seedRegulation(
    icobsData.regulation.id,
    regulators[icobsData.regulation.regulatorId],
    icobsData.regulation.title,
    icobsData.regulation.citation,
    icobsData.regulation.type,
    icobsData.regulation.status,
    icobsData.regulation.effectiveDate,
    icobsData.regulation.url,
    icobsData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += icobs.obligationCount;
  totalClauses += icobs.clauseCount;

  // DISP
  console.log("\nSeeding DISP...");
  const disp = await seedRegulation(
    dispData.regulation.id,
    regulators[dispData.regulation.regulatorId],
    dispData.regulation.title,
    dispData.regulation.citation,
    dispData.regulation.type,
    dispData.regulation.status,
    dispData.regulation.effectiveDate,
    dispData.regulation.url,
    dispData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += disp.obligationCount;
  totalClauses += disp.clauseCount;

  // SYSC
  console.log("\nSeeding SYSC...");
  const sysc = await seedRegulation(
    syscData.regulation.id,
    regulators[syscData.regulation.regulatorId],
    syscData.regulation.title,
    syscData.regulation.citation,
    syscData.regulation.type,
    syscData.regulation.status,
    syscData.regulation.effectiveDate,
    syscData.regulation.url,
    syscData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += sysc.obligationCount;
  totalClauses += sysc.clauseCount;

  // CASS
  console.log("\nSeeding CASS...");
  const cass = await seedRegulation(
    cassData.regulation.id,
    regulators[cassData.regulation.regulatorId],
    cassData.regulation.title,
    cassData.regulation.citation,
    cassData.regulation.type,
    cassData.regulation.status,
    cassData.regulation.effectiveDate,
    cassData.regulation.url,
    cassData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += cass.obligationCount;
  totalClauses += cass.clauseCount;

  // PROD
  console.log("\nSeeding PROD...");
  const prod = await seedRegulation(
    prodData.regulation.id,
    regulators[prodData.regulation.regulatorId],
    prodData.regulation.title,
    prodData.regulation.citation,
    prodData.regulation.type,
    prodData.regulation.status,
    prodData.regulation.effectiveDate,
    prodData.regulation.url,
    prodData.sections as SectionData[],
    productTypeMap
  );
  totalObligations += prod.obligationCount;
  totalClauses += prod.clauseCount;

  const regulationCount = 11;
  console.log(`\nSeed complete:`);
  console.log(`  Regulators: ${Object.keys(regulators).length}`);
  console.log(`  Regulations: ${regulationCount} (Consumer Duty, PSR 2017, BCOBS, MCOB, CONC, COBS, ICOBS, DISP, SYSC, CASS, PROD)`);
  console.log(`  Product types: ${Object.keys(productTypeMap).length}`);
  console.log(`  Obligations: ${totalObligations}`);
  console.log(`  Clause templates: ${totalClauses}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
