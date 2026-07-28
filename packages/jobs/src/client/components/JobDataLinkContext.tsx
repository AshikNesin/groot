import { createContext, useContext, type ReactNode } from "react";

export interface LinkResolution {
  to: string;
  label?: string;
}

export type LinkResolver = (key: string, value: unknown) => LinkResolution | null;

interface JobDataLinkContextValue {
  resolveLink?: LinkResolver;
}

const JobDataLinkContext = createContext<JobDataLinkContextValue>({});

export interface JobsProviderProps {
  children: ReactNode;
  linkResolver?: LinkResolver;
}

export function JobsProvider({ children, linkResolver }: JobsProviderProps) {
  return (
    <JobDataLinkContext.Provider value={{ resolveLink: linkResolver }}>
      {children}
    </JobDataLinkContext.Provider>
  );
}

export function useJobDataLink(): JobDataLinkContextValue {
  return useContext(JobDataLinkContext);
}
