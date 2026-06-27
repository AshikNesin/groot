/**
 * UI component barrel — single import surface for all primitives.
 *
 *   import { Button, Dialog, Input } from "@/ui";
 *
 * Design tokens live in client/src/index.css (CSS variables) and are surfaced
 * via semantic Tailwind classes (bg-primary, text-foreground, border-border, …).
 * Do not use raw palette colors (gray-*, red-*, …) outside index.css.
 */

export { Alert, AlertTitle, AlertDescription } from "./alert";
export { Badge, badgeVariants } from "./badge";
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
export { Button, buttonVariants } from "./button";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
export { Checkbox } from "./checkbox";
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./form";
export { Input } from "./input";
export { Label } from "./label";
export { Skeleton, SkeletonList } from "./loading-skeleton";
export type { SkeletonVariants } from "./loading-skeleton";
export { LoadingSpinner, LoadingState } from "./loading-spinner";
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "./select";
export { Separator } from "./separator";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./table";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
export { Textarea } from "./textarea";
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
export { Toaster } from "./toaster";
