// Scholarship fit for one university, from the student's profile and the university's own data.
// Every point has a stated reason; a university is a match when the student meets its English
// requirement and the overall fit reaches 50.
export function scholarshipFit(uni, profile) {
  if (!uni?.scholarships) return null;
  const reasons = [];
  let score = 0;

  const gpa = Number(profile.gpa) || 0;
  const gpaPts = Math.round(Math.max(0, Math.min(1, (gpa - 2.5) / 1.5)) * 30);
  score += gpaPts;
  if (gpa >= 3.5) reasons.push('Strong GPA');
  else if (gpa >= 3.0) reasons.push('Good GPA');

  const need = Number(uni.ielts_min) || 0;
  const ielts = Number(profile.ielts) || 0;
  const meetsEnglish = !need || ielts >= need;
  if (meetsEnglish) {
    score += 25;
    reasons.push(need ? `Meets IELTS ${need}` : 'No IELTS minimum listed');
  }

  const testRequired = uni.gre_required || uni.gmat_required;
  if (!testRequired) score += 10;
  else if (profile.gre || profile.gmat) { score += 10; reasons.push('Test scores ready'); }

  const tuition = uni.tuition_usd;
  if (tuition == null || tuition <= (Number(profile.budget) || 0)) {
    score += 10;
    if (tuition != null) reasons.push(tuition === 0 ? 'Free tuition' : 'Within budget');
  }

  if (profile.extracurriculars) { score += 8; reasons.push('Extracurriculars'); }
  if ((Number(profile.work_experience_years) || 0) >= 2) { score += 8; reasons.push('Work experience'); }
  if (profile.research_experience) { score += 9; reasons.push('Research experience'); }

  score = Math.min(100, score);
  return { score, reasons, eligible: meetsEnglish && score >= 50 };
}
