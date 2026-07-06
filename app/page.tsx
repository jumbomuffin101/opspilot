import { Architecture } from "@/components/home/Architecture";
import { CTA } from "@/components/home/CTA";
import { Features } from "@/components/home/Features";
import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SlackBenefits } from "@/components/home/SlackBenefits";
import { SlackMockup } from "@/components/home/SlackMockup";

export default function Home() {
  return (
    <div className="page-shell min-h-screen overflow-hidden">
      <div className="grid-overlay pointer-events-none absolute inset-x-0 top-0 h-[760px]" />
      <Header />
      <main>
        <Hero />
        <SlackMockup />
        <HowItWorks />
        <Features />
        <Architecture />
        <SlackBenefits />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
