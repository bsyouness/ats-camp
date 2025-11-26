import { Timestamp } from 'firebase/firestore';

export type UserRole = 'member' | 'admin';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
  displayName: string;
  photoURL: string | null;
  playaName: string | null;
  bio: string | null;
  skills: string[];
  contactInfo: {
    email?: string;
    phone?: string;
  };
  yearsAttended: number[];
  tentNumber: number | null;
}

export interface Shift {
  id: string;
  title: string;
  description: string;
  date: Timestamp;
  startTime: string;
  endTime: string;
  location: string;
  slots: ShiftSlot[];
  createdBy: string;
  createdAt: Timestamp;
}

export interface ShiftSlot {
  id: string;
  assignedTo: string | null;
  preAssigned: boolean;
}

export interface CampMap {
  year: number;
  imageUrl: string;
  spots: CampSpot[];
  uploadedBy: string;
  uploadedAt: Timestamp;
}

export interface CampSpot {
  number: number;
  x: number;
  y: number;
  assignedTo: string | null;
}

export interface Media {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  uploadedAt: Timestamp;
  year: number;
  description: string;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  message: string;
  type: 'contact' | 'whatsapp_request' | 'issue_report';
  createdAt: Timestamp;
  handled: boolean;
}

export interface SiteConfig {
  campDuesLink: string;
  notionLink: string;
  whatsappGroupLink: string;
  packingList: PackingItem[];
  usefulLinks: UsefulLink[];
}

export interface PackingItem {
  item: string;
  category: string;
}

export interface UsefulLink {
  title: string;
  url: string;
  description: string;
}
