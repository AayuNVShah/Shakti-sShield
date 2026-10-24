import { CallScenario } from './types';

export const CALL_SCENARIOS: CallScenario[] = [
  {
    id: 'digital_arrest_hi',
    title: 'Digital Arrest Scam',
    titleHi: 'डिजिटल अरेस्ट फ्रॉड',
    titleGu: 'ડિજિટલ એરેસ્ટ કૌભાંડ',
    language: 'hi',
    languageLabel: 'Hindi (हिंदी)',
    audioUrl: '/demo-audio/digital_arrest_hi.wav',
    expectedCategory: 'scam',
    primaryThreat: 'CBI Impersonation & Digital Arrest Demand',
    expectedRedFlags: [
      'AUTHORITY_IMPERSONATION',
      'THREAT_OR_COERCION',
      'MONEY_TRANSFER_REQUEST',
    ],
    durationEstimateSec: 18,
    description:
      'Caller falsely claims to be a CBI / Police DSP investigating a parcel with MDMA narcotics and passports at Mumbai Airport, threatening non-bailable arrest unless funds are sent.',
    sampleTranscript:
      'सावधान! मैं सीबीआई हेडक्वार्टर नई दिल्ली से डीएसपी विक्रम राठौड़ बोल रहा हूँ... आप अभी डिजिटल अरेस्ट में हैं! तुरंत हमारे सरकारी एस्क्रो अकाउंट में सिक्योरिटी डिपॉजिट ट्रांसफर करें!',
  },
  {
    id: 'fake_kyc_gu',
    title: 'Bank KYC Expiry Scam',
    titleHi: 'बैंक खाता व केवाईसी फ्रॉड',
    titleGu: 'બેંક કેવાયસી બ્લોકિંગ ફ્રોડ',
    language: 'gu',
    languageLabel: 'Gujarati (ગુજરાતી)',
    audioUrl: '/demo-audio/fake_kyc_gu.wav',
    expectedCategory: 'scam',
    primaryThreat: 'Urgent OTP & Bank Account Suspension Threat',
    expectedRedFlags: [
      'AUTHORITY_IMPERSONATION',
      'SUSPICIOUS_KYC',
      'URGENCY',
      'OTP_OR_CREDENTIAL_REQUEST',
    ],
    durationEstimateSec: 16,
    description:
      'Caller impersonates SBI Bank Manager warning that savings account and ATM card will be blocked within 1 hour unless the victim discloses their 6-digit SMS OTP.',
    sampleTranscript:
      'નમસ્તે સાહેબ, હું સ્ટેટ બેન્ક હેડ ઓફિસથી મેનેજર શર્મા બોલું છું... તમારું એટીએમ કાર્ડ બ્લોક થઈ જશે, હમણાં જ છ અંકનો ઓટીપી નંબર આપો!',
  },
  {
    id: 'fake_courier_hi',
    title: 'Fake International Courier Scam',
    titleHi: 'फेडेक्स / कस्टम्स पार्सल फ्रॉड',
    titleGu: 'કુરિયર પાર્સલ જપ્તી કૌભાંડ',
    language: 'hi',
    languageLabel: 'Hindi (हिंदी)',
    audioUrl: '/demo-audio/fake_courier_hi.wav',
    expectedCategory: 'scam',
    primaryThreat: 'Customs Contraband Seizure & Money Penalty',
    expectedRedFlags: [
      'SUSPICIOUS_COURIER',
      'THREAT_OR_COERCION',
      'MONEY_TRANSFER_REQUEST',
    ],
    durationEstimateSec: 17,
    description:
      'Caller poses as FedEx Customs stating a parcel sent to Taiwan contains illegal narcotics and forged passports, demanding instant clearance penalty payment to avoid prison.',
    sampleTranscript:
      'हेलो, यह फेडेक्स और कस्टम्स डिपार्टमेंट का अर्जेंट कॉल है। आपके पार्सल में प्रतिबंधित सामान मिला है... जेल जाने से बचना है तो वेरिफिकेशन पेनल्टी ट्रांसफर करें!',
  },
  {
    id: 'genuine_call_gu',
    title: 'Genuine Courier Delivery',
    titleHi: 'वास्तविक कूरियर डिलीवरी कॉल',
    titleGu: 'સાચી ડિલિવરી પુષ્ટિ કૉલ',
    language: 'gu',
    languageLabel: 'Gujarati (ગુજરાતી)',
    audioUrl: '/demo-audio/genuine_call_gu.wav',
    expectedCategory: 'genuine',
    primaryThreat: 'None (Legitimate Service Inquiry)',
    expectedRedFlags: ['NONE'],
    durationEstimateSec: 15,
    description:
      'Courteous delivery person arriving at the gate, asking politely for apartment directions without requesting OTPs, sensitive credentials, or payments.',
    sampleTranscript:
      'નમસ્તે સાહેબ, હું બ્લુ ડાર્ટ કુરિયર ડિલિવરી બોય બોલું છું. તમારું એક પાર્સલ આવ્યું છે... કોઈ ઓટીપી કે પૈસા આપવાની જરૂર નથી, બસ સહી કરી આપજો.',
  },
];
