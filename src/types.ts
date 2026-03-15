export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  companyId: string;
  createdAt: any;
}

export interface Invitation {
  email: string;
  companyId: string;
  role: UserRole;
  invitedBy: string;
  createdAt: any;
}

export interface TimeLog {
  id?: string;
  userId: string;
  userName: string;
  type: 'in' | 'out';
  timestamp: any;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  companyId: string;
}

export interface Project {
  id?: string;
  name: string;
  description?: string;
  companyId: string;
  status: 'active' | 'completed';
  createdAt: any;
}

export interface ProjectStage {
  id?: string;
  projectId: string;
  title: string;
  description?: string;
  completed: boolean;
  completedBy?: string;
  completedByName?: string;
  completedAt?: any;
  companyId: string;
}

export interface CompanySettings {
  id: string; // companyId
  checkoutReminders: string[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
