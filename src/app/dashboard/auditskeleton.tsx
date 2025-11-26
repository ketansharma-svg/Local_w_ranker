import { motion } from "framer-motion";
const shimmerVariants: any = {
    animate: {
        backgroundPosition: ["-200% 0", "200% 0"],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "linear",
        },
    },
};

const SkeletonBox = ({ className = "" }) => (
    <motion.div
        className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded-md ${className}`}
        variants={shimmerVariants}
        animate="animate"
    />
);

const AuditSkeleton = () => {
    return (
        <div className="p-6 space-y-4 ">
            <SkeletonBox className="h-6 w-1/3" />
            <div className="grid grid-cols-3 gap-4">
                <SkeletonBox className="h-24 col-span-1" />
                <SkeletonBox className="h-24 col-span-1" />
                <SkeletonBox className="h-24 col-span-1" />
            </div>
            <SkeletonBox className="h-6 w-1/4" />
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <SkeletonBox key={i} className="h-4 w-full" />
                ))}
            </div>
            <SkeletonBox className="h-6 w-1/4" />
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <SkeletonBox key={i} className="h-4 w-full" />
                ))}
            </div>
            <SkeletonBox className="h-6 w-1/4" />
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <SkeletonBox key={i} className="h-4 w-full" />
                ))}
            </div>
        </div>
    );
};

export default AuditSkeleton;
