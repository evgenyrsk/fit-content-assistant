import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Search, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = { title: 'Meta review guide — Forme' };

export default function MetaReviewPage() {
  return (
    <main className="policy-page review-guide" lang="en">
      <nav><Link href="/"><ArrowLeft aria-hidden="true" />Back to Forme</Link><span>Reviewer guide · draft</span></nav>
      <header><p className="overline">META APP REVIEW</p><h1>Threads trend research in Forme</h1><p>Forme uses public Threads keyword search to help one fitness author discover timely topics. A trend signal is never presented as scientific evidence.</p></header>
      <section className="policy-highlight"><Search aria-hidden="true" /><div><strong>Requested use</strong><p><code>threads_basic</code> identifies the authorized profile. <code>threads_keyword_search</code> fetches recent public posts matching an explicit query or a bounded fitness-topic set.</p></div></section>
      <section><h2>Reviewer steps</h2><ol><li>Open the review build and enter the reviewer access details supplied in Meta’s secure review notes.</li><li>Open <strong>Workspace → Live Signals</strong>.</li><li>Select <strong>Threads</strong> as the source.</li><li>Enter a fitness keyword or run the default bounded search.</li><li>Observe that every result is labelled as a live trend signal and can only be sent to the separate scientific research workflow.</li></ol></section>
      <section><h2>Data minimization</h2><ul><li>Forme requests post id, text, timestamp and permalink.</li><li>The stored signal contains shortened text, permalink, observed time and derived relevance scores.</li><li>Forme does not publish replies or Threads posts in this flow.</li><li>The server-side token is never exposed to the browser.</li></ul></section>
      <section className="policy-highlight"><CheckCircle2 aria-hidden="true" /><div><strong>Expected result after approval</strong><p>Fresh public posts from beyond the app’s test users become eligible for ranking. Scientific validation remains a separate, blocking step.</p></div></section>
      <section className="policy-pending"><ShieldAlert aria-hidden="true" /><div><h2>Not public yet</h2><p>This guide is review-ready source material, not a submitted application. Public hosting, reviewer access and App Review submission require the owner’s final confirmation.</p></div></section>
    </main>
  );
}
