export interface Email {
  uid: number;
  from: string;
  subject: string;
  date: string;
  snippet?: string;
  flags: string[];
}

export interface EmailThread {
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  html?: string;
}
