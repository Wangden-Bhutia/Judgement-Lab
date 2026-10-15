/**
 * India-specific support routes. Each was verified on an official government source on 13 Oct 2026;
 * see docs/support-sources.md for URLs and what each source says. Re-verify before changing.
 */
export const SUPPORT = {
  emergency: { number: '112', label: 'Emergency Response Support System (police, fire, ambulance)', source: 'https://www.112.gov.in/' },
  teleManas: { numbers: ['14416', '1-800-891-4416'], label: 'Tele-MANAS, the free national tele-mental-health helpline', source: 'https://telemanas.mohfw.gov.in/home' },
  posh: {
    source: 'https://wcd.nic.in/sites/default/files/Sexual-Harassment-at-Workplace-Act.pdf',
    summary: 'Under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 (often called the POSH Act), every employer must set up an Internal Committee (sometimes called the ICC) to receive sexual-harassment complaints. Where there is no Internal Committee because the workplace has fewer than ten workers, or the complaint is against the employer, the complaint goes to the Local Committee set up by the District Officer for the district; the District Officer also names nodal officers at block, taluka or ward level who forward complaints to it.',
  },
} as const;

export const SUPPORT_LESSON_TEXT = 'In India: in an emergency, dial 112. For free mental-health support, Tele-MANAS answers on 14416 or 1-800-891-4416. Both are government services.';
export const POSH_SHORT = 'In India, sexual harassment at work can be reported to your employer\'s Internal Committee under the POSH Act, 2013. If there is no Internal Committee (fewer than ten workers) or the complaint is against the employer, the Local Committee set up by the District Officer receives it.';
