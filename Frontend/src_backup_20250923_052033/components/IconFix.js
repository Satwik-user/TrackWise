/**
 * Global icon fix for all components
 * This file exports all the corrected icons that can be imported by components
 */

// Import the correct icons from our mappings
export {
  TrendingUpIcon,
  TrendingDownIcon,
  TrainIcon,
  DownloadIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ChartBarIcon,
  ClockIcon,
  MapIcon,
  HomeIcon,
  UserCircleIcon,
  BellIcon,
  Cog6ToothIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  MinusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentIcon,
  ShareIcon,
  PrinterIcon,
  CubeIcon,
  BoltIcon,
  ShieldCheckIcon,
  ServerIcon,
  CpuChipIcon,
  Bars3Icon,
  XCircleIcon,
  InformationCircleIcon,
} from '../utils/iconMappings';

// Export formatters
export { formatTime } from '../utils/formatters';

// Export useDebounce with all its variants
export { 
  default as useDebounce,
  useAdvancedDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
  useDebouncedApiCall 
} from '../hooks/useDebounce';