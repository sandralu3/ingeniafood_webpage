import { AccessSection } from "@/components/oliva/access";
import { ChangeSection } from "@/components/oliva/change";
import { FaqSection } from "@/components/oliva/faq";
import { Footer } from "@/components/oliva/Footer";
import { OlivaHeader } from "@/components/oliva/Header";
import { Hero } from "@/components/oliva/Hero";
import { ProcessSection } from "@/components/oliva/process";
import { StorySection } from "@/components/oliva/story";
import { WhySection } from "@/components/oliva/why";

export default function OlivaLandingPage() {
  return (
    <>
      <OlivaHeader />
      <main>
        <Hero />
        <StorySection />
        <ProcessSection />
        <ChangeSection />
        <WhySection />
        <AccessSection />
        {/* One snap target for the end — FAQ without snap was unreachable with mandatory snap */}
        <div className="oliva-landing-end">
          <FaqSection />
          <Footer />
        </div>
      </main>
    </>
  );
}
