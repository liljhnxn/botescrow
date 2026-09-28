import { ethers } from "hardhat";

async function main() {
  const address = "0x8db360CD0D94B557a587Eb023AD75444A9573b14";
  const escrow = await ethers.getContractAt("BotEscrow", address);
  for (let i = 1; i <= 2; i++) {
    const job = await escrow.getJob(i);
    const milestones = await escrow.getJobMilestones(i);
    console.log(`Job #${i} status:`, job.status);
    console.log(`Job #${i} milestones count:`, milestones.length);
    milestones.forEach((m, idx) => {
      console.log(`  Milestone #${idx + 1}: status = ${m.status}, title = "${m.title}", amount = ${ethers.formatEther(m.amount)} BOT`);
    });
  }
}

main().catch(console.error);
