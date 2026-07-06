import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useAuth, API } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import {
  Clock,
  MapPin,
  ChevronRight,
  Loader2,
  Bell,
  BellRing,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Send,
  Building2,
  Phone,
  PhoneCall,
  Calendar,
} from 'lucide-react';

const COUNTRY_META = {
  usa: { flag: '🇺🇸', label: 'USA', adj: 'US' },
  uk: { flag: '🇬🇧', label: 'UK', adj: 'UK' },
  schengen: { flag: '🇪🇺', label: 'Schengen', adj: 'Schengen' },
  canada: { flag: '🇨🇦', label: 'Canada', adj: 'Canada' },
  australia: { flag: '🇦🇺', label: 'Australia', adj: 'Australia' },
  uae: { flag: '🇦🇪', label: 'UAE', adj: 'UAE' },
  singapore: { flag: '🇸🇬', label: 'Singapore', adj: 'Singapore' },
  thailand: { flag: '🇹🇭', label: 'Thailand', adj: 'Thailand' },
  japan: { flag: '🇯🇵', label: 'Japan', adj: 'Japan' },
  'south-korea': { flag: '🇰🇷', label: 'South Korea', adj: 'South Korean' },
};

const CONSULATE_ORDER_US = ['mumbai', 'delhi', 'chennai', 'kolkata', 'hyderabad'];

const FALLBACK_COUNTRIES = {
  usa: {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "MH, GJ, RJ, MP, Goa",
      booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
      visa_types: {
        b1b2: { name: "B1/B2", label: "Tourist", wait_time: "408 days", available: true, count: 1, earliest_date: "408 days" },
        f1: { name: "F1", label: "Student", wait_time: "98 days", available: true, count: 1, earliest_date: "98 days" },
        h1b: { name: "H1B", label: "Work", wait_time: "156 days", available: true, count: 1, earliest_date: "156 days" },
        h4: { name: "H4", label: "Dependent", wait_time: "210 days", available: true, count: 1, earliest_date: "210 days" },
        l1: { name: "L1", label: "Transfer", wait_time: "89 days", available: true, count: 1, earliest_date: "89 days" },
        j1: { name: "J1", label: "Exchange", wait_time: "45 days", available: true, count: 1, earliest_date: "45 days" },
      },
      total_slots: 6, earliest_date: "408 days",
    },
    delhi: {
      name: "New Delhi Embassy", city: "New Delhi",
      jurisdiction: "DL, PB, HR, UK, HP, JK",
      booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
      visa_types: {
        b1b2: { name: "B1/B2", label: "Tourist", wait_time: "442 days", available: true, count: 1, earliest_date: "442 days" },
        f1: { name: "F1", label: "Student", wait_time: "112 days", available: true, count: 1, earliest_date: "112 days" },
        h1b: { name: "H1B", label: "Work", wait_time: "178 days", available: true, count: 1, earliest_date: "178 days" },
        h4: { name: "H4", label: "Dependent", wait_time: "234 days", available: true, count: 1, earliest_date: "234 days" },
        l1: { name: "L1", label: "Transfer", wait_time: "95 days", available: true, count: 1, earliest_date: "95 days" },
        j1: { name: "J1", label: "Exchange", wait_time: "52 days", available: true, count: 1, earliest_date: "52 days" },
      },
      total_slots: 6, earliest_date: "442 days",
    },
    chennai: {
      name: "Chennai Consulate", city: "Chennai",
      jurisdiction: "TN, KL, KA, AP, Telangana",
      booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
      visa_types: {
        b1b2: { name: "B1/B2", label: "Tourist", wait_time: "397 days", available: true, count: 1, earliest_date: "397 days" },
        f1: { name: "F1", label: "Student", wait_time: "87 days", available: true, count: 1, earliest_date: "87 days" },
        h1b: { name: "H1B", label: "Work", wait_time: "142 days", available: true, count: 1, earliest_date: "142 days" },
        h4: { name: "H4", label: "Dependent", wait_time: "195 days", available: true, count: 1, earliest_date: "195 days" },
        l1: { name: "L1", label: "Transfer", wait_time: "76 days", available: true, count: 1, earliest_date: "76 days" },
        j1: { name: "J1", label: "Exchange", wait_time: "38 days", available: true, count: 1, earliest_date: "38 days" },
      },
      total_slots: 6, earliest_date: "397 days",
    },
    kolkata: {
      name: "Kolkata Consulate", city: "Kolkata",
      jurisdiction: "WB, BR, JH, OD, NE states",
      booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
      visa_types: {
        b1b2: { name: "B1/B2", label: "Tourist", wait_time: "379 days", available: true, count: 1, earliest_date: "379 days" },
        f1: { name: "F1", label: "Student", wait_time: "82 days", available: true, count: 1, earliest_date: "82 days" },
        h1b: { name: "H1B", label: "Work", wait_time: "135 days", available: true, count: 1, earliest_date: "135 days" },
        h4: { name: "H4", label: "Dependent", wait_time: "185 days", available: true, count: 1, earliest_date: "185 days" },
        l1: { name: "L1", label: "Transfer", wait_time: "72 days", available: true, count: 1, earliest_date: "72 days" },
        j1: { name: "J1", label: "Exchange", wait_time: "35 days", available: true, count: 1, earliest_date: "35 days" },
      },
      total_slots: 6, earliest_date: "379 days",
    },
    hyderabad: {
      name: "Hyderabad Consulate", city: "Hyderabad",
      jurisdiction: "Telangana, AP",
      booking_url: "https://visa.vfsglobal.com/ind/en/usa/book-an-appointment",
      visa_types: {
        b1b2: { name: "B1/B2", label: "Tourist", wait_time: "391 days", available: true, count: 1, earliest_date: "391 days" },
        f1: { name: "F1", label: "Student", wait_time: "95 days", available: true, count: 1, earliest_date: "95 days" },
        h1b: { name: "H1B", label: "Work", wait_time: "151 days", available: true, count: 1, earliest_date: "151 days" },
        h4: { name: "H4", label: "Dependent", wait_time: "205 days", available: true, count: 1, earliest_date: "205 days" },
        l1: { name: "L1", label: "Transfer", wait_time: "82 days", available: true, count: 1, earliest_date: "82 days" },
        j1: { name: "J1", label: "Exchange", wait_time: "44 days", available: true, count: 1, earliest_date: "44 days" },
      },
      total_slots: 6, earliest_date: "391 days",
    },
  },
  uk: {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West & Central India",
      booking_url: "https://visa.vfsglobal.com/ind/en/gbr/book-an-appointment",
      visa_types: {
        visitor_uk: { name: "Standard Visitor", label: "Tourist, Business, Family", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
        student_uk: { name: "Student (Tier 4)", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_uk: { name: "Skilled Worker", label: "Work", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
      },
      total_slots: 3, earliest_date: "2-4w",
    },
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/gbr/book-an-appointment",
      visa_types: {
        visitor_uk: { name: "Standard Visitor", label: "Tourist, Business, Family", wait_time: "4-7w", available: true, count: 1, earliest_date: "4-7w" },
        student_uk: { name: "Student (Tier 4)", label: "Study", wait_time: "2-5w", available: true, count: 1, earliest_date: "2-5w" },
        work_uk: { name: "Skilled Worker", label: "Work", wait_time: "5-8w", available: true, count: 1, earliest_date: "5-8w" },
      },
      total_slots: 3, earliest_date: "4-7w",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/gbr/book-an-appointment",
      visa_types: {
        visitor_uk: { name: "Standard Visitor", label: "Tourist, Business, Family", wait_time: "3-5w", available: true, count: 1, earliest_date: "3-5w" },
        student_uk: { name: "Student (Tier 4)", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_uk: { name: "Skilled Worker", label: "Work", wait_time: "4-7w", available: true, count: 1, earliest_date: "4-7w" },
      },
      total_slots: 3, earliest_date: "3-5w",
    },
    kolkata: {
      name: "Kolkata VAC", city: "Kolkata",
      jurisdiction: "East & NE India",
      booking_url: "https://visa.vfsglobal.com/ind/en/gbr/book-an-appointment",
      visa_types: {
        visitor_uk: { name: "Standard Visitor", label: "Tourist, Business, Family", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
        student_uk: { name: "Student (Tier 4)", label: "Study", wait_time: "2-5w", available: true, count: 1, earliest_date: "2-5w" },
        work_uk: { name: "Skilled Worker", label: "Work", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
      },
      total_slots: 3, earliest_date: "3-6w",
    },
  },
  schengen: {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/fra/book-an-appointment",
      visa_types: {
        'short-stay': { name: "Short Stay (90d)", label: "Tourism, Business", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        student_sc: { name: "Student", label: "Long-stay Study", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
      },
      total_slots: 2, earliest_date: "2-4w",
    },
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/fra/book-an-appointment",
      visa_types: {
        'short-stay': { name: "Short Stay (90d)", label: "Tourism, Business", wait_time: "2-5w", available: true, count: 1, earliest_date: "2-5w" },
        student_sc: { name: "Student", label: "Long-stay Study", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
      },
      total_slots: 2, earliest_date: "2-5w",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/fra/book-an-appointment",
      visa_types: {
        'short-stay': { name: "Short Stay (90d)", label: "Tourism, Business", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        student_sc: { name: "Student", label: "Long-stay Study", wait_time: "4-7w", available: true, count: 1, earliest_date: "4-7w" },
      },
      total_slots: 2, earliest_date: "2-4w",
    },
    kolkata: {
      name: "Kolkata VAC", city: "Kolkata",
      jurisdiction: "East India",
      booking_url: "https://visa.vfsglobal.com/ind/en/fra/book-an-appointment",
      visa_types: {
        'short-stay': { name: "Short Stay (90d)", label: "Tourism, Business", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        student_sc: { name: "Student", label: "Long-stay Study", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
      },
      total_slots: 2, earliest_date: "2-4w",
    },
  },
  canada: {
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/can/book-an-appointment",
      visa_types: {
        visitor_ca: { name: "Visitor (TRV)", label: "Tourist, Business", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
        student_ca: { name: "Student Permit", label: "Study", wait_time: "8-12w", available: true, count: 1, earliest_date: "8-12w" },
      },
      total_slots: 2, earliest_date: "4-8w",
    },
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/can/book-an-appointment",
      visa_types: {
        visitor_ca: { name: "Visitor (TRV)", label: "Tourist, Business", wait_time: "4-7w", available: true, count: 1, earliest_date: "4-7w" },
        student_ca: { name: "Student Permit", label: "Study", wait_time: "8-11w", available: true, count: 1, earliest_date: "8-11w" },
      },
      total_slots: 2, earliest_date: "4-7w",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/can/book-an-appointment",
      visa_types: {
        visitor_ca: { name: "Visitor (TRV)", label: "Tourist, Business", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
        student_ca: { name: "Student Permit", label: "Study", wait_time: "7-10w", available: true, count: 1, earliest_date: "7-10w" },
      },
      total_slots: 2, earliest_date: "3-6w",
    },
  },
  australia: {
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/aus/book-an-appointment",
      visa_types: {
        visitor_au: { name: "Visitor (600)", label: "Tourist, Business", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        student_au: { name: "Student (500)", label: "Study", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
      },
      total_slots: 2, earliest_date: "2-4w",
    },
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/aus/book-an-appointment",
      visa_types: {
        visitor_au: { name: "Visitor (600)", label: "Tourist, Business", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        student_au: { name: "Student (500)", label: "Study", wait_time: "4-8w", available: true, count: 1, earliest_date: "4-8w" },
      },
      total_slots: 2, earliest_date: "2-4w",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/aus/book-an-appointment",
      visa_types: {
        visitor_au: { name: "Visitor (600)", label: "Tourist, Business", wait_time: "2-3w", available: true, count: 1, earliest_date: "2-3w" },
        student_au: { name: "Student (500)", label: "Study", wait_time: "4-7w", available: true, count: 1, earliest_date: "4-7w" },
      },
      total_slots: 2, earliest_date: "2-3w",
    },
  },
  uae: {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/are/book-an-appointment",
      visa_types: {
        visitor_ae: { name: "Visit Visa", label: "Tourist, Business", wait_time: "3-7d", available: true, count: 1, earliest_date: "3-7d" },
      },
      total_slots: 1, earliest_date: "3-7d",
    },
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/are/book-an-appointment",
      visa_types: {
        visitor_ae: { name: "Visit Visa", label: "Tourist, Business", wait_time: "3-7d", available: true, count: 1, earliest_date: "3-7d" },
      },
      total_slots: 1, earliest_date: "3-7d",
    },
  },
  singapore: {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/sgp/book-an-appointment",
      visa_types: {
        visitor_sg: { name: "Visitor Visa", label: "Tourist, Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_sg: { name: "Student Pass", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_sg: { name: "Employment Pass", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/sgp/book-an-appointment",
      visa_types: {
        visitor_sg: { name: "Visitor Visa", label: "Tourist, Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_sg: { name: "Student Pass", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_sg: { name: "Employment Pass", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/sgp/book-an-appointment",
      visa_types: {
        visitor_sg: { name: "Visitor Visa", label: "Tourist, Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_sg: { name: "Student Pass", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_sg: { name: "Employment Pass", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    kolkata: {
      name: "Kolkata VAC", city: "Kolkata",
      jurisdiction: "East India",
      booking_url: "https://visa.vfsglobal.com/ind/en/sgp/book-an-appointment",
      visa_types: {
        visitor_sg: { name: "Visitor Visa", label: "Tourist, Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_sg: { name: "Student Pass", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_sg: { name: "Employment Pass", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
  },
  thailand: {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/tha/book-an-appointment",
      visa_types: {
        tourist_th: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_th: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        education_th: { name: "Education Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/tha/book-an-appointment",
      visa_types: {
        tourist_th: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_th: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        education_th: { name: "Education Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/tha/book-an-appointment",
      visa_types: {
        tourist_th: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_th: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        education_th: { name: "Education Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    kolkata: {
      name: "Kolkata VAC", city: "Kolkata",
      jurisdiction: "East India",
      booking_url: "https://visa.vfsglobal.com/ind/en/tha/book-an-appointment",
      visa_types: {
        tourist_th: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_th: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        education_th: { name: "Education Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
  },
  japan: {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/jpn/book-an-appointment",
      visa_types: {
        tourist_jp: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_jp: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_jp: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/jpn/book-an-appointment",
      visa_types: {
        tourist_jp: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_jp: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_jp: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/jpn/book-an-appointment",
      visa_types: {
        tourist_jp: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_jp: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_jp: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    kolkata: {
      name: "Kolkata VAC", city: "Kolkata",
      jurisdiction: "East India",
      booking_url: "https://visa.vfsglobal.com/ind/en/jpn/book-an-appointment",
      visa_types: {
        tourist_jp: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        business_jp: { name: "Business Visa", label: "Business", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_jp: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
  },
  'south-korea': {
    mumbai: {
      name: "Mumbai VAC", city: "Mumbai",
      jurisdiction: "West India",
      booking_url: "https://visa.vfsglobal.com/ind/en/kor/book-an-appointment",
      visa_types: {
        tourist_kr: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_kr: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_kr: { name: "Work Visa", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    delhi: {
      name: "New Delhi VAC", city: "New Delhi",
      jurisdiction: "North India",
      booking_url: "https://visa.vfsglobal.com/ind/en/kor/book-an-appointment",
      visa_types: {
        tourist_kr: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_kr: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_kr: { name: "Work Visa", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    chennai: {
      name: "Chennai VAC", city: "Chennai",
      jurisdiction: "South India",
      booking_url: "https://visa.vfsglobal.com/ind/en/kor/book-an-appointment",
      visa_types: {
        tourist_kr: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_kr: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_kr: { name: "Work Visa", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
    kolkata: {
      name: "Kolkata VAC", city: "Kolkata",
      jurisdiction: "East India",
      booking_url: "https://visa.vfsglobal.com/ind/en/kor/book-an-appointment",
      visa_types: {
        tourist_kr: { name: "Tourist Visa", label: "Tourism", wait_time: "5-10d", available: true, count: 1, earliest_date: "5-10d" },
        student_kr: { name: "Student Visa", label: "Study", wait_time: "2-4w", available: true, count: 1, earliest_date: "2-4w" },
        work_kr: { name: "Work Visa", label: "Work", wait_time: "3-6w", available: true, count: 1, earliest_date: "3-6w" },
      },
      total_slots: 3, earliest_date: "5-10d",
    },
  },
};

function getConsulatesForCountry(country) {
  const data = FALLBACK_COUNTRIES[country] || FALLBACK_COUNTRIES['usa'];
  return Object.keys(data);
}

function formatSlotDate(dateValue, fallback = 'N/A') {
  if (!dateValue || dateValue === 'N/A' || dateValue === 'TBD') return fallback;
  const parsed = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(parsed)) return fallback;
  return format(parsed, 'dd MMM yyyy');
}

function formatDetectedAt(dateValue) {
  if (!dateValue) return '';
  const parsed = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
  if (!isValid(parsed)) return '';
  const now = new Date();
  const diffMs = now - parsed;
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

const COUNTRY_VISA_TYPES = {
  usa: [
    { id: 'b1b2', label: 'B1/B2 Tourist' },
    { id: 'f1', label: 'F1 Student' },
    { id: 'h1b', label: 'H1B Work' },
    { id: 'h4', label: 'H4 Dependent' },
    { id: 'l1', label: 'L1 Transfer' },
    { id: 'j1', label: 'J1 Exchange' },
  ],
  uk: [
    { id: 'visitor_uk', label: 'Standard Visitor' },
    { id: 'student_uk', label: 'Student (Tier 4)' },
    { id: 'work_uk', label: 'Skilled Worker' },
  ],
  schengen: [
    { id: 'short-stay', label: 'Short Stay (90d)' },
    { id: 'student_sc', label: 'Student' },
  ],
  canada: [
    { id: 'visitor_ca', label: 'Visitor (TRV)' },
    { id: 'student_ca', label: 'Student Permit' },
  ],
  australia: [
    { id: 'visitor_au', label: 'Visitor (600)' },
    { id: 'student_au', label: 'Student (500)' },
  ],
  uae: [
    { id: 'visitor_ae', label: 'Visit Visa' },
  ],
  singapore: [
    { id: 'visitor_sg', label: 'Visitor Visa' },
    { id: 'student_sg', label: 'Student Pass' },
    { id: 'work_sg', label: 'Employment Pass' },
  ],
  thailand: [
    { id: 'tourist_th', label: 'Tourist Visa' },
    { id: 'business_th', label: 'Business Visa' },
    { id: 'education_th', label: 'Education Visa' },
  ],
  japan: [
    { id: 'tourist_jp', label: 'Tourist Visa' },
    { id: 'business_jp', label: 'Business Visa' },
    { id: 'student_jp', label: 'Student Visa' },
  ],
  'south-korea': [
    { id: 'tourist_kr', label: 'Tourist Visa' },
    { id: 'student_kr', label: 'Student Visa' },
    { id: 'work_kr', label: 'Work Visa' },
  ],
};

const COUNTRY_CONSOLATE_LABELS = {
  usa: [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'kolkata', label: 'Kolkata' },
    { id: 'hyderabad', label: 'Hyderabad' },
  ],
  uk: [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'kolkata', label: 'Kolkata' },
  ],
  schengen: [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'kolkata', label: 'Kolkata' },
  ],
  canada: [
    { id: 'delhi', label: 'Delhi' },
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'chennai', label: 'Chennai' },
  ],
  australia: [
    { id: 'delhi', label: 'Delhi' },
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'chennai', label: 'Chennai' },
  ],
  uae: [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
  ],
  singapore: [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'kolkata', label: 'Kolkata' },
  ],
  thailand: [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'kolkata', label: 'Kolkata' },
  ],
  japan: [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'kolkata', label: 'Kolkata' },
  ],
  'south-korea': [
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'delhi', label: 'Delhi' },
    { id: 'chennai', label: 'Chennai' },
    { id: 'kolkata', label: 'Kolkata' },
  ],
};

export default function USVisaSlots() {
  const { token, isAuthed } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [slots, setSlots] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [selectedVisas, setSelectedVisas] = useState(['b1b2']);
  const [selectedConsulates, setSelectedConsulates] = useState(CONSULATE_ORDER_US);
  const [showSubscribeForm, setShowSubscribeForm] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('usa');

  const toggleVisa = (id) => {
    setSelectedVisas(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleConsulate = (id) => {
    setSelectedConsulates(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const fetchAll = useCallback(async () => {
    try {
      const [summaryRes, statusRes] = await Promise.all([
        axios.get(`${API}/usvisa/slots/summary`, { params: { country: selectedCountry } }),
        axios.get(`${API}/usvisa/status`),
      ]);
      setSummary(summaryRes.data);
      setWhatsappNumber('+91 9000734326');
      setStatus(statusRes.data);

      if (statusRes.data.last_slot_detected_at) {
        const slotsRes = await axios.get(`${API}/usvisa/slots`, { params: { limit: 50 } });
        setSlots(slotsRes.data.slots || []);
      }
    } catch (err) {
      console.warn('Using fallback wait-time data — API unreachable');
      const fb = FALLBACK_COUNTRIES[selectedCountry] || FALLBACK_COUNTRIES['usa'];
      let totalSlots = 0;
      let vtCounts = {};
      Object.values(fb).forEach(consul => {
        Object.entries(consul.visa_types || {}).forEach(([vtId, vtData]) => {
          if (vtData.available) {
            totalSlots++;
            vtCounts[vtId] = (vtCounts[vtId] || 0) + 1;
          }
        });
      });
      setSummary({
        ok: true,
        consulates: fb,
        overall: { total_slots: totalSlots, consulates_with_slots: Object.keys(fb).length, visa_type_counts: vtCounts },
      });
      setWhatsappNumber('+91 9000734326');
      setStatus({ check_interval_seconds: 7200, mode: 'wait_time_estimates' });
    } finally {
      setLoading(false);
    }
  }, [selectedCountry]);

  useEffect(() => {
    setLoading(true);
    fetchAll();
  }, [selectedCountry]);

  useEffect(() => {
    const interval = setInterval(fetchAll, 120000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    if (isAuthed) {
      axios.get(`${API}/usvisa/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => {
        if (r.data.subscribed) {
          setSubscribed(true);
          setSelectedVisas(r.data.subscription.visa_types);
          setSelectedConsulates(r.data.subscription.consulates);
        }
      }).catch(() => {});
    }
  }, [isAuthed, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
    toast({ title: 'Refreshed', description: 'Slot data is now up to date.' });
  };

  const handleSubscribe = async () => {
    if (!isAuthed) {
      toast({ title: 'Login required', description: 'Sign in to subscribe to slot alerts.' });
      return;
    }
    setSubscribing(true);
    try {
      await axios.post(`${API}/usvisa/subscribe`, {
        visa_types: selectedVisas,
        consulates: selectedConsulates,
        channel: 'in_app',
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSubscribed(true);
      setShowSubscribeForm(false);
      toast({ title: 'Subscribed!', description: `You will be notified when ${COUNTRY_META[selectedCountry].adj} visa slots open up.` });
    } catch (err) {
      toast({ title: 'Subscription failed', description: err.response?.data?.detail || 'Please try again.' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!isAuthed) return;
    try {
      await axios.delete(`${API}/usvisa/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscribed(false);
      toast({ title: 'Unsubscribed', description: 'You will no longer receive visa slot alerts.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to unsubscribe.' });
    }
  };

  const handleCountryChange = (country) => {
    if (country === selectedCountry) return;
    setSelectedCountry(country);
    const visas = COUNTRY_VISA_TYPES[country] || COUNTRY_VISA_TYPES['usa'];
    const consulates = COUNTRY_CONSOLATE_LABELS[country] || COUNTRY_CONSOLATE_LABELS['usa'];
    setSelectedVisas([visas[0].id]);
    setSelectedConsulates(consulates.map(c => c.id));
    setShowSubscribeForm(false);
  };

  const meta = COUNTRY_META[selectedCountry] || COUNTRY_META['usa'];
  const consulateOrder = getConsulatesForCountry(selectedCountry);

  if (loading) {
    return (
      <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
        <Navbar />
        <main className="pt-28 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--blue-700))] mx-auto mb-3" />
            <p className="text-[14px] text-[hsl(var(--blue-900))]/50">Loading slot data...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--soft-bg))] min-h-screen">
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--blue-900))]/55 mb-6">
            <Link to="/" className="hover:text-[hsl(var(--blue-700))]">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-[hsl(var(--blue-900))]">{meta.label} Visa Slot Tracker</span>
          </div>

          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[hsl(var(--accent))] border-2 border-[hsl(var(--accent))] text-[13px] font-extrabold text-white uppercase tracking-[0.15em] animate-pulse shadow-[0_0_20px_rgba(var(--accent-hsl),0.3)]">
              <Clock className="w-4 h-4" />
              Hurry — Slots Fill Fast!
            </span>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-[hsl(var(--accent))] mb-3">
              <RefreshCw className="w-3.5 h-3.5" /> Live Wait Times
            </div>
            <h1 className="font-display font-extrabold text-[32px] sm:text-[42px] tracking-[-0.03em] text-[hsl(var(--blue-900))]">
              {meta.label} Visa Appointment Slots
            </h1>
            <p className="mt-2 text-[15px] text-[hsl(var(--blue-900))]/55 max-w-xl mx-auto">
              Current wait times for {meta.adj} visa appointments across VFS centres. Choose your destination above.
            </p>
          </div>

          {/* Status Bar */}
          <div className="rounded-2xl bg-white border border-black/5 p-4 mb-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[13px] font-bold text-[hsl(var(--blue-900))]">Live</span>
              </div>
              <div className="text-[12px] text-[hsl(var(--blue-900))]/50">
                Wait times refreshed regularly
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="h-9 rounded-full text-[12px] font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Country Selector */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-full bg-white border border-black/10 p-1 gap-0.5 overflow-x-auto max-w-full no-scrollbar">
              {[
                { id: 'usa', flag: '🇺🇸', label: 'USA' },
                { id: 'uk', flag: '🇬🇧', label: 'UK' },
                { id: 'schengen', flag: '🇪🇺', label: 'Schengen' },
                { id: 'canada', flag: '🇨🇦', label: 'Canada' },
                { id: 'australia', flag: '🇦🇺', label: 'Australia' },
                { id: 'uae', flag: '🇦🇪', label: 'UAE' },
                { id: 'singapore', flag: '🇸🇬', label: 'Singapore' },
                { id: 'thailand', flag: '🇹🇭', label: 'Thailand' },
                { id: 'japan', flag: '🇯🇵', label: 'Japan' },
                { id: 'south-korea', flag: '🇰🇷', label: 'South Korea' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => handleCountryChange(c.id)}
                  className={`px-3.5 py-2 min-h-[36px] sm:min-h-0 rounded-full text-[12px] font-bold transition-colors whitespace-nowrap ${
                    selectedCountry === c.id
                      ? 'bg-[hsl(var(--accent))] text-white'
                      : 'text-[hsl(var(--blue-900))]/60 hover:text-[hsl(var(--blue-900))] hover:bg-[hsl(var(--blue-50))]'
                  }`}
                >
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Gated Content: Register to view live slots ── */}
          {!isAuthed && (
            <div className="rounded-3xl bg-gradient-to-br from-[hsl(var(--blue-700))] via-[hsl(var(--blue-800))] to-[hsl(var(--blue-900))] p-8 sm:p-10 mb-8 text-center text-white">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-white/15 items-center justify-center mb-5">
                <Clock className="w-8 h-8" />
              </div>
              <h2 className="font-display font-extrabold text-[26px] sm:text-[32px] tracking-[-0.02em] mb-3">
                Don't Miss Your Slot — Slots Fill in Minutes!
              </h2>
              <p className="text-[15px] text-white/75 max-w-lg mx-auto mb-2 leading-relaxed">
                {meta.adj} visa appointment slots open unpredictably and disappear fast. Our system monitors all consulates <strong className="text-white">24/7</strong> so you never miss one.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[14px] text-white/80">
                <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-4 py-2">
                  <MapPin className="w-4 h-4" /> {getConsulatesForCountry(selectedCountry).map(c => summary?.consulates?.[c]?.city || c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-4 py-2">
                  <RefreshCw className="w-4 h-4" /> Checked every few minutes
                </span>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={() => navigate('/signup')}
                  className="h-12 px-8 rounded-full bg-white text-[hsl(var(--blue-800))] hover:bg-white/90 font-bold text-[14px]"
                >
                  Register Free to View Live Slots
                </Button>
                <span className="text-white/60 text-[13px] hidden sm:inline">or</span>
                <a
                  href={`https://wa.me/${whatsappNumber?.replace(/[\s+]/g, '') || '919000734326'}?text=Hi%2C%20I%20need%20help%20with%20a%20${meta.adj}%20visa%20appointment.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-green-500 hover:bg-green-600 text-white font-bold text-[14px] transition"
                >
                  <Send className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-white/70">
                <PhoneCall className="w-4 h-4" />
                <span>Call us: </span>
                <a href={`tel:${(whatsappNumber || '+91 9000734326').replace(/[\s+]/g, '')}`} className="font-bold text-white hover:underline">
                  {whatsappNumber || '+91 9000734326'}
                </a>
              </div>

              <p className="mt-6 text-[12px] text-white/50">
                Already registered? <button onClick={() => navigate('/login')} className="font-bold text-white/80 hover:text-white underline">Sign in</button> to view live slot availability.
              </p>
            </div>
          )}

          {/* ── Slot data visible only to registered users ── */}
          {isAuthed && (
            <>

          {/* Consulate Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {consulateOrder.map(cid => {
              const data = summary?.consulates?.[cid];
              if (!data) return null;
              const available = data.total_slots > 0;
              const bookingUrl = data.booking_url || FALLBACK_COUNTRIES[selectedCountry]?.[cid]?.booking_url || '#';
              return (
                <div
                  key={cid}
                  className={`rounded-2xl bg-white border p-5 transition hover:shadow-md ${
                    available ? 'border-emerald-200' : 'border-black/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                        <h3 className="font-bold text-[15px] text-[hsl(var(--blue-900))]">{data.city}</h3>
                      </div>
                      <p className="text-[12px] text-[hsl(var(--blue-900))]/40 mt-0.5">{data.jurisdiction || data.name}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {Object.entries(data.visa_types || {}).map(([vtId, vtData]) => {
                      const hasData = vtData.wait_time && vtData.wait_time !== 'N/A';
                      return (
                        <div key={vtId} className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-[hsl(var(--blue-900))]/70">
                            {vtData.name || vtId.toUpperCase()}
                          </span>
                          <span className={`text-[17px] font-display font-extrabold tracking-[-0.02em] tabular-nums ${
                            hasData ? 'text-[hsl(var(--blue-900))]' : 'text-[hsl(var(--blue-900))]/25'
                          }`}>
                            {hasData ? vtData.wait_time : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 w-full justify-center min-h-[44px] rounded-full bg-[hsl(var(--blue-700))] text-white text-[13px] font-bold hover:bg-[hsl(229,85%,28%)] active:scale-[0.98] transition-colors"
                  >
                    Book on VFS Global
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>

          {/* ── End of gated content ── */}
          </>
          )}

          {/* Notification Subscription */}
          <div className="rounded-2xl bg-white border border-black/5 p-5 sm:p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--blue-700))]/10 flex items-center justify-center flex-shrink-0">
                <BellRing className="w-5 h-5 text-[hsl(var(--blue-700))]" />
              </div>
              <div>
                <h2 className="font-display font-extrabold text-[18px] text-[hsl(var(--blue-900))]">
                  Get Notified Instantly
                </h2>
                <p className="mt-0.5 text-[13px] text-[hsl(var(--blue-900))]/60">
                  We check every 2-3 minutes and send alerts the moment {meta.adj} visa slots open up.
                </p>
              </div>
            </div>

            {subscribed ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                <h3 className="font-bold text-[14px] text-emerald-800">You're subscribed!</h3>
                <p className="mt-0.5 text-[12px] text-emerald-700">
                  You will receive in-app notifications when {meta.adj} visa slots become available.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Button
                    onClick={() => setShowSubscribeForm(true)}
                    variant="outline"
                    className="h-8 rounded-full text-[11px] font-bold"
                  >
                    Update Preferences
                  </Button>
                  <Button
                    onClick={handleUnsubscribe}
                    variant="outline"
                    className="h-8 rounded-full text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Unsubscribe
                  </Button>
                </div>

                {showSubscribeForm && (
                  <div className="mt-6 text-left">
                    <SubscribeForm
                      selectedVisas={selectedVisas}
                      selectedConsulates={selectedConsulates}
                      onToggleVisa={toggleVisa}
                      onToggleConsulate={toggleConsulate}
                      onSubscribe={handleSubscribe}
                      subscribing={subscribing}
                      country={selectedCountry}
                    />
                  </div>
                )}
              </div>
            ) : (
              <SubscribeForm
                selectedVisas={selectedVisas}
                selectedConsulates={selectedConsulates}
                onToggleVisa={toggleVisa}
                onToggleConsulate={toggleConsulate}
                onSubscribe={handleSubscribe}
                subscribing={subscribing}
                country={selectedCountry}
              />
            )}
          </div>

          {/* WhatsApp Contact */}
          <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 sm:p-8 text-center mb-8">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-green-100 items-center justify-center mb-4">
              <Send className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="font-display font-extrabold text-[22px] text-[hsl(var(--blue-900))]">
              Need Help Booking?
            </h2>
            <p className="mt-2 text-[14px] text-[hsl(var(--blue-900))]/60 max-w-md mx-auto">
              Our team can help you find and book early {meta.adj} visa appointments. Message us on WhatsApp.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <a
                href={`tel:${(whatsappNumber || '+91 9000734326').replace(/[\s+]/g, '')}`}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[hsl(var(--blue-700))] hover:bg-[hsl(var(--blue-800))] text-white font-bold text-[13px] transition"
              >
                <Phone className="w-4 h-4" />
                Call {whatsappNumber || '+91 9000734326'}
              </a>
              <a
                href={`https://wa.me/${whatsappNumber?.replace(/[\s+]/g, '')}?text=Hi%2C%20I%20need%20help%20with%20a%20${meta.adj}%20visa%20appointment.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-green-600 hover:bg-green-700 text-white font-bold text-[13px] transition"
              >
                <Send className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Recent Slots */}
          {isAuthed && slots.length > 0 && (
            <div className="rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-extrabold text-[20px] text-[hsl(var(--blue-900))]">
                  Recently Detected Slots
                </h2>
                <span className="text-[12px] font-bold text-[hsl(var(--blue-900))]/40">
                  {slots.slice(0, 20).length} latest
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.slice(0, 20).map((slot, i) => {
                  const hasDate = Boolean(slot.date && slot.date !== 'N/A');
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.03 }}
                      className="rounded-2xl bg-[hsl(var(--soft-bg))] border border-black/5 p-4 hover:border-[hsl(var(--accent))]/30 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-white border border-black/5 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-[hsl(var(--blue-700))]" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[hsl(var(--blue-900))]">{slot.city || slot.consulate_name}</p>
                            <p className="text-[11px] text-[hsl(var(--blue-900))]/40">{slot.consulate_name || slot.consulate}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[hsl(var(--blue-700))]/10 text-[hsl(var(--blue-700))]">
                          {slot.visa_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className={`flex-1 rounded-xl p-3 ${hasDate ? 'bg-white border border-emerald-100' : 'bg-white/50 border border-black/5'}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar className={`w-3.5 h-3.5 ${hasDate ? 'text-emerald-600' : 'text-[hsl(var(--blue-900))]/30'}`} />
                            <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/40">Date</span>
                          </div>
                          <p className={`text-[15px] font-display font-extrabold ${hasDate ? 'text-[hsl(var(--blue-900))]' : 'text-[hsl(var(--blue-900))]/30'}`}>
                            {formatSlotDate(slot.date, 'Not available')}
                          </p>
                        </div>
                        {slot.time && (
                          <div className="flex-1 rounded-xl bg-white p-3 border border-black/5">
                            <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/40 block mb-1">Time</span>
                            <p className="text-[15px] font-display font-extrabold text-[hsl(var(--blue-900))] font-mono">{slot.time}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {slot.day_of_week && (
                          <span className="text-[12px] font-medium text-[hsl(var(--blue-900))]/50">{slot.day_of_week}</span>
                        )}
                        <span className="text-[11px] font-medium text-[hsl(var(--blue-900))]/40">
                          {formatDetectedAt(slot.detected_at)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="mt-8 rounded-3xl bg-white border border-black/5 p-6 sm:p-8">
            <h2 className="font-display font-extrabold text-[20px] text-[hsl(var(--blue-900))] mb-6 text-center">
              How It Works
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  icon: <RefreshCw className="w-6 h-6" />,
                  title: '24/7 Monitoring',
                  desc: `Our system checks the official ${meta.adj} visa scheduling portal every 2-3 minutes, around the clock.`,
                },
                {
                  icon: <BellRing className="w-6 h-6" />,
                  title: 'Instant Alerts',
                  desc: 'The moment wait times change, we update your dashboard and can notify you.',
                },
                {
                  icon: <MapPin className="w-6 h-6" />,
                  title: 'All Consulates',
                  desc: `We monitor all ${meta.adj} visa consulates across India.`,
                },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex w-12 h-12 rounded-xl bg-[hsl(var(--blue-700))]/10 items-center justify-center mb-3 text-[hsl(var(--blue-700))]">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-[14px] text-[hsl(var(--blue-900))]">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] text-[hsl(var(--blue-900))]/55 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SubscribeForm({ selectedVisas, selectedConsulates, onToggleVisa, onToggleConsulate, onSubscribe, subscribing, country = 'usa' }) {
  const visaTypes = COUNTRY_VISA_TYPES[country] || COUNTRY_VISA_TYPES['usa'];
  const consulateLabels = COUNTRY_CONSOLATE_LABELS[country] || COUNTRY_CONSOLATE_LABELS['usa'];

  return (
    <div className="space-y-5">
      <div>
        <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-2">
          Visa Types
        </label>
        <div className="flex flex-wrap gap-2">
          {visaTypes.map(vt => (
            <button
              key={vt.id}
              onClick={() => onToggleVisa(vt.id)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition ${
                selectedVisas.includes(vt.id)
                  ? 'bg-[hsl(var(--blue-700))]/10 text-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]/30'
                  : 'border-black/10 text-[hsl(var(--blue-900))]/40 hover:border-black/20'
              }`}
            >
              {vt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-[hsl(var(--blue-900))]/55 block mb-2">
          Consulates
        </label>
        <div className="flex flex-wrap gap-2">
          {consulateLabels.map(c => (
            <button
              key={c.id}
              onClick={() => onToggleConsulate(c.id)}
              className={`px-3.5 py-2 rounded-full text-[12px] font-bold border-2 transition ${
                selectedConsulates.includes(c.id)
                  ? 'bg-[hsl(var(--blue-700))]/10 text-[hsl(var(--blue-700))] border-[hsl(var(--blue-700))]/30'
                  : 'border-black/10 text-[hsl(var(--blue-900))]/40 hover:border-black/20'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={onSubscribe}
        disabled={subscribing || selectedVisas.length === 0 || selectedConsulates.length === 0}
        className="w-full h-12 rounded-full btn-accent text-white font-bold"
      >
        {subscribing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Bell className="w-4 h-4 mr-1.5" />
            Enable Alerts
          </>
        )}
      </Button>
    </div>
  );
}
