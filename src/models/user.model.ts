export interface User {
  id: number;
  name: string;
  email: string;
}

export const getUser = (): User => {
  return {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
  };
};
