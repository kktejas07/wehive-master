import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { assessmentApi, type Pathway } from '../model/assessment-api';

export function useAssessment() {
  const [step, setStep] = useState(1);
  const [pathway, setPathway] = useState<Pathway | ''>('');

  // PR fields
  const [prAge, setPrAge] = useState('28');
  const [prEdu, setPrEdu] = useState('masters');
  const [prLanguage, setPrLanguage] = useState('clb9');
  const [prExp, setPrExp] = useState('3plus');

  // Student fields
  const [studentCountry, setStudentCountry] = useState('ca');
  const [studentEdu, setStudentEdu] = useState('bachelors');
  const [studentGpa, setStudentGpa] = useState('80');
  const [studentBudget, setStudentBudget] = useState('mid');

  // Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const submit = useMutation({
    mutationFn: () => {
      const parts = name.trim().split(' ');
      const message = pathway === 'pr'
        ? `Pathway: Canada PR\nAge: ${prAge}\nEducation: ${prEdu}\nLanguage: ${prLanguage}\nExperience: ${prExp}`
        : pathway === 'student'
        ? `Pathway: Student Visa\nCountry: ${studentCountry}\nEducation: ${studentEdu}\nGPA: ${studentGpa}%\nBudget: ${studentBudget}`
        : `Pathway: ${pathway}`;
      return assessmentApi.submit({
        name: parts[0],
        surname: parts.slice(1).join(' ') || '',
        email,
        phone: phone || null,
        message,
        source: 'visa_assessment_mobile',
      });
    },
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(1, s - 1));

  const selectPathway = (p: Pathway) => {
    setPathway(p);
    next();
  };

  const ready = name.trim().length >= 2 && email.includes('@');

  return {
    step, pathway,
    prAge, setPrAge, prEdu, setPrEdu, prLanguage, setPrLanguage, prExp, setPrExp,
    studentCountry, setStudentCountry, studentEdu, setStudentEdu, studentGpa, setStudentGpa, studentBudget, setStudentBudget,
    name, setName, email, setEmail, phone, setPhone,
    ready,
    submitted: submit.isSuccess,
    submitting: submit.isPending,
    submitError: submit.error ? (submit.error as Error).message : null,
    next, back, selectPathway,
    submit: () => submit.mutate(),
  };
}
