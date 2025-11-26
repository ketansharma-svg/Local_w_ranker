"use client"
import InviteMemberModal from '@/src/app/(team)/team-management/InviteMemberModal';
import { useProfile } from '@/src/redux/providers/ProfileProvider';
import { useTour } from '@/src/redux/providers/TourProvider';
import { fetchTeamDetails, InviteConfirmIn } from '@/src/redux/reducer/teamReducer';
import { resetProjectState } from '@/src/redux/reducer/projectReducer';
import { BASE_URL_WR } from '@/src/util/api';
import axios from 'axios';
import { Tooltip } from 'antd';
import { AnimatePresence, easeOut, motion } from "framer-motion";
import Cookies from 'js-cookie';
import {
  BookOpen,
  Building,
  ChevronDown, CreditCard,
  FileText,
  Loader2,
  Megaphone,
  Search, UserPlus,
  Wrench
} from 'lucide-react';
import { CheckCircleFilled, ClockCircleFilled } from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MdOutlineLogout } from 'react-icons/md';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';


const Header = () => {

  // const { user } = useSelector((state: RootState) => state.userReducer);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false)
  const [open, setOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const logoutGuardRef = useRef(false);

  const router = useRouter()
  const dispatch = useDispatch<any>()

  const { data: session, status } = useSession()

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.25, ease: easeOut }
    },
    exit: { opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } },
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        moreRef.current &&
        !moreRef.current.contains(event.target as Node)
      ) {
        setOptionsVisible(false);
        setIsMoreOpen(false);
      }
    }
    if (optionsVisible || isMoreOpen) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [optionsVisible, isMoreOpen]);

  const clearClientSession = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    [
      "login_access_token_wrank",
      "login_refresh_token_wrank",
      "session_last_activity",
      "session_expires_at",
    ].forEach((cookie) => Cookies.remove(cookie));
  }, []);

  const performLogout = useCallback(
    async ({ silent = false, message }: { silent?: boolean; message?: string } = {}) => {
      if (logoutGuardRef.current) return;

      logoutGuardRef.current = true;
      if (!silent) {
        setIsLoggingOut(true);
      }

      const token = Cookies.get("login_access_token_wrank");
      const hasNextAuthSession = status === "authenticated" && !!session;

      try {
        if (token) {
          try {
            await axios.post(`${BASE_URL_WR}backend-auth/logout/`, {}, {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
          } catch (apiErr) {
            console.warn("API logout failed (possibly expired token):", apiErr);
          }
        }

        clearClientSession();

        if (hasNextAuthSession) {
          await signOut({ redirect: false });
        }

        if (message) {
          toast.info(message);
        } else if (!silent) {
          toast.success("Logged out successfully");
        }
      } catch (error) {
        console.error("Logout error:", error);
        if (!silent) {
          toast.error("An error occurred during logout");
        }
      } finally {
        dispatch(resetProjectState());
        router.push("/signin");

        if (!silent) {
          setIsLoggingOut(false);
        }

        setTimeout(() => {
          logoutGuardRef.current = false;
        }, 300);
      }
    },
    [router, session, status]
  );

  const handleLogout = useCallback(() => {
    void performLogout();
  }, [performLogout]);

  useEffect(() => {
    if (status === "loading") return;

    const enforceSession = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      const token = Cookies.get("login_access_token_wrank");
      if (!token) {
        void performLogout({
          silent: true,
          message: "Your session has ended. Please sign in again.",
        });
      }
    };

    enforceSession();

    window.addEventListener("focus", enforceSession);
    document.addEventListener("visibilitychange", enforceSession);

    return () => {
      window.removeEventListener("focus", enforceSession);
      document.removeEventListener("visibilitychange", enforceSession);
    };
  }, [performLogout, status]);


  const { profile } = useProfile()

  const agencyProfile = profile?.profile;
  const isAgency = agencyProfile?.user_type === "agency";
  const verificationStatus = agencyProfile?.agency_verified
    ? {
      label: 'Trusted agency',
      tooltip: 'Verified by Wranker.',
      className: 'bg-emerald-500 border-emerald-200 text-white shadow-sm',
      icon: CheckCircleFilled
    }
    : {
      label: 'Verification pending',
      tooltip: 'Awaiting review by the Wranker compliance team.',
      className: 'bg-amber-500 text-white border-amber-200 shadow-sm',
      icon: ClockCircleFilled
    };
  const VerificationIcon = verificationStatus.icon;

  const normalizeHexColor = (color?: string) => {
    if (!color) return undefined;
    const cleaned = color.trim().replace(/^#/, "");
    if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(cleaned)) return undefined;
    return `#${cleaned}`;
  };

  const getRelativeLuminance = (hexColor: string) => {
    const hex = hexColor.replace("#", "");
    const normalized = hex.length === 3
      ? hex.split("").map((char) => char + char).join("")
      : hex.length === 8
        ? hex.slice(0, 6)
        : hex;
    const [r, g, b] = [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ].map((value) => value / 255);
    const toLinear = (channel: number) =>
      channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    const [lr, lg, lb] = [r, g, b].map(toLinear);
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };

  const getContrastingTextColor = (hexColor: string) => {
    const luminance = getRelativeLuminance(hexColor);
    const contrastWithWhite = (1.0 + 0.05) / (luminance + 0.05);
    const contrastWithBlack = (luminance + 0.05) / 0.05;
    return contrastWithBlack >= contrastWithWhite ? "#0f172a" : "#ffffff";
  };

  const getMutedTextColor = (hexColor: string) => {
    const base = getContrastingTextColor(hexColor);
    return base === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.72)";
  };

  const agencyPrimaryColor = normalizeHexColor(agencyProfile?.agency_primary_color);
  const headerTextColor = agencyPrimaryColor ? getContrastingTextColor(agencyPrimaryColor) : "#ffffff";
  const headerMutedColor = agencyPrimaryColor ? getMutedTextColor(agencyPrimaryColor) : "rgba(255,255,255,0.7)";
  const headerStyle = agencyPrimaryColor
    ? { backgroundColor: agencyPrimaryColor, color: headerTextColor }
    : { color: headerTextColor };
  const inviteTextColorBase = agencyPrimaryColor
    ? getContrastingTextColor(agencyPrimaryColor)
    : '#008CCD';
  const inviteTextColor = inviteTextColorBase === '#ffffff' ? '#0f172a' : inviteTextColorBase;
  const inviteButtonStyle = { backgroundColor: 'white', color: inviteTextColor };
  const logoSrc = isAgency && agencyProfile?.agency_logo ? agencyProfile.agency_logo : '/images/logo.png';
  const agencyTagline = isAgency ? agencyProfile?.agency_tagline : null;
  const agencyName = isAgency ? agencyProfile?.agency_name : null;
  const userInitial = profile?.username?.[0]?.toUpperCase()
    || profile?.first_name?.[0]?.toUpperCase()
    || profile?.email?.[0]?.toUpperCase()
    || "";


  const toggleMore = () => {
    setIsMoreOpen((prev) => !prev);
    setOptionsVisible(false); // close profile
  };

  const toggleProfile = () => {
    setOptionsVisible((prev) => !prev);
    setIsMoreOpen(false); // close more
  };


  return (
    <header ref={dropdownRef} className='flex flex-wrap items-center justify-between bg-brand-blue1 py-3 px-4' style={headerStyle}>
      <div className='flex flex-1 min-w-0 items-center gap-4'>
        <div className="flex items-center gap-3 min-w-0">

          <Link href='/'>
            <div className="relative h-9 w-[140px] overflow-hidden rounded-md  ">
              <Image
                src={logoSrc}
                alt="logo"
                fill
                className={isAgency ? "object-cover" : ""}
                priority
              />
            </div>
          </Link>

          {isAgency && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate max-w-[180px]">{agencyName || profile?.username}</p>
                <Tooltip title={verificationStatus.tooltip} placement="right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-full border ${verificationStatus.className}`}>
                    <VerificationIcon className="text-[12px]" />
                    {verificationStatus.label}
                  </span>
                </Tooltip>
              </div>


              <p className="text-[11px] uppercase tracking-wide flex items-center gap-1">
                Powered by
                <Image
                  src="/favicon.ico"
                  alt="you"
                  width={15}
                  height={15}
                />
                Wranker
              </p>

            </div>
          )}
        </div>

        {/* <div className="flex-1 w-full mx-4 hidden md:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.6)' }} />
            <input
              type="text"
              placeholder="Search"
              data-tour="global-search"
              className="w-full h-9 pl-10 pr-3 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/60 focus:outline-none transition-all"
              style={{ color: 'rgba(255,255,255,0.9)' }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '1px solid #4286F5';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(66,134,245,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div> */}
      </div>



      <div className=" flex items-center gap-2 ml-auto">
        {/* <button
          type="button"
          onClick={() => startTour("quickstart")}
          disabled={isRunning()}
          aria-label="Start Quickstart Tour"
        >
          Help
        </button> */}
        {/* Invite CTA */}
        <button
          className="hidden sm:inline-flex px-3 py-2 h-9 rounded-md text-sm font-medium transition-colors"
          style={inviteButtonStyle}
          onClick={() => setOpen(true)}
          data-tour="nav-teams"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.92)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
        >
          <UserPlus size={16} className="mr-2" />
          Invite Others to Collaborate
        </button>
        <InviteMemberModal open={open} onClose={() => setOpen(false)}
          onResult={(_res: InviteConfirmIn) => {
            dispatch(fetchTeamDetails({ force: true }))
            router.push('/roles-management')
          }} />
        {/* Pricing CTA */}
        <button
          className="hidden sm:inline-flex px-3 py-2 h-9 rounded-md text-sm font-medium transition-colors border"
          style={{ borderColor: headerMutedColor, color: headerTextColor, backgroundColor: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <CreditCard size={16} className="mr-2" />
          Pricing
        </button>

        {/* More dropdown */}
        <div ref={moreRef} className="relative">
          <button
            onClick={toggleMore}
            className="px-3 py-2 h-9 rounded-md text-sm font-medium transition-colors flex items-center hover:bg-white/12"
            style={{ color: headerTextColor }}
          >
            More <ChevronDown size={16} className="ml-1" />
          </button>

          <AnimatePresence>
            {isMoreOpen && (
              <motion.div
                className="absolute right-0 mt-2 w-60 bg-white text-gray-800 rounded-md shadow-lg border border-gray-100 z-50"
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <a className="flex items-center px-3 py-2 text-sm hover:bg-gray-50" href="https://wranker.com/" rel="noopener noreferrer" target='_blank'>
                  <Wrench size={16} className="mr-2 text-gray-500" />Features
                </a>
                <a className="flex items-center px-3 py-2 text-sm hover:bg-gray-50" href="#">
                  <BookOpen size={16} className="mr-2 text-gray-500" />Guide
                </a>
                <a className="flex items-center px-3 py-2 text-sm hover:bg-gray-50" href="https://wranker.com/blog/" rel="noopener noreferrer" target='_blank'>
                  <FileText size={16} className="mr-2 text-gray-500" />Blog
                </a>
                <a className="flex items-center px-3 py-2 text-sm hover:bg-gray-50" href="#">
                  <Building size={16} className="mr-2 text-gray-500" />About company
                </a>
                <a className="flex items-center px-3 py-2 text-sm hover:bg-gray-50" href="https://w3era.com/" rel="noopener noreferrer" target='_blank'>
                  <Megaphone size={16} className="mr-2 text-gray-500" />Hire Agency for Services
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          ref={dropdownRef}
          className={`cursor-pointer rounded-full hover:bg-white h-10 w-10 flex items-center justify-center font-medium border border-white ${optionsVisible ? " bg-white text-black" : "bg-white "
            }`}
          style={!optionsVisible ? { color: agencyPrimaryColor ? (agencyPrimaryColor) : "#008ccd", borderColor: headerTextColor } : undefined}
          onClick={toggleProfile}
        >
          <p>{userInitial || "?"}</p>
        </div>

        <AnimatePresence>
          {optionsVisible && (
            <motion.div
              className="absolute top-12 right-0 w-72 bg-white shadow-2xl rounded-xl backdrop-blur-lg z-50"
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Link
                href="/accounts"
                className="block py-2.5 truncate px-4 hover:bg-gray-100/50 hover:cursor-pointer rounded-t-xl"
              >
                <p className="text-[15px] font-semibold text-black">
                  My profile • ID:{profile?.id}
                </p>
                <p className="text-[15px] break-all text-gray-800">
                  {profile?.email}
                </p>
              </Link>
              <ul className="text-black text-[15px]">
                <li>
                  <button className="w-full text-left hover:bg-gray-100 px-4 py-[5px] hover:cursor-pointer">
                    Subscription info
                  </button>
                </li>
                <li>
                  <Link href='/roles-management' className="w-full text-left hover:bg-gray-100 px-4 py-[5px] hover:cursor-pointer inline-block">
                    Manage users
                  </Link>
                </li>
                <li onClick={handleLogout}>
                  <button className="w-full text-left hover:bg-gray-100 px-4 py-[5px] hover:cursor-pointer rounded-b-xl flex items-center gap-2">
                    {isLoggingOut ? (
                      <Loader2 className="animate-spin w-4 h-4 text-brand-blue1" />
                    ) : (
                      <MdOutlineLogout />
                    )}
                    Log out
                  </button>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </header>
  )
}

export default Header
