import React from "react";
import { bannerStyles } from "../assets/dummyStyles";
import { Clock, Ribbon, ShieldUser, Star, Stethoscope, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Banner = () => {
  const navigate = useNavigate();
  return (
    <div className={bannerStyles.bannerContainer}>
      <div className={bannerStyles.mainContainer}>
        <div className={bannerStyles.borderOutline}>
          <div className={bannerStyles.outerAnimatedBand}></div>
          <div className={bannerStyles.innerWhiteBorder}></div>
        </div>

        <div className={bannerStyles.contentContainer}>
          <div className={bannerStyles.flexContainer}>
            <div className={bannerStyles.headerBadgeContainer}>
              {/* Stethoscope */}
              <div className={bannerStyles.stethoscopeContainer}>
                <div className={bannerStyles.stethoscopeInner}>
                  <Stethoscope className={bannerStyles.stethoscopeIcon} />
                </div>
              </div>

              {/* Title */}
              <div className={bannerStyles.titleContainer}>
                <h1 className={bannerStyles.title}>
                  Medi
                  <span className={bannerStyles.titleGradient}>
                    Care+
                  </span>
                </h1>

                {/* Stars */}
                <div className={bannerStyles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={bannerStyles.starIcon}
                      fill="currentColor"
                    />
                  ))}
                </div>

                {/* Tagline */}
                <p className={bannerStyles.tagline}>
                  Premium Healthcare
                  <span className={`block ${bannerStyles.taglineHighlight}`}>
                    At Your Fingertips
                  </span>
                </p>
                <div className={bannerStyles.featuresGrid}>
                  <div className={`${bannerStyles.featureItem} ${bannerStyles.featureBorderGreen}`}>
                    <Ribbon className={bannerStyles.featureIcon}/>
                   <span className={bannerStyles.featureText}>Certified Specification</span>
                  </div>


<div className={`${bannerStyles.featureItem} ${bannerStyles.featureBorderBlue}`}>
                    <Clock className={bannerStyles.featureIcon}/>
                   <span className={bannerStyles.featureText}>24/7 Availability</span>
                  </div>

                  <div className={`${bannerStyles.featureItem} ${bannerStyles.featureBorderEmerald}`}>
                    <ShieldUser className={bannerStyles.featureIcon}/>
                   <span className={bannerStyles.featureText}>Safe &amp; Secure </span>
                  </div>
                  <div className={`${bannerStyles.featureItem} ${bannerStyles.featureBorderPurple}`}>
                    <User className={bannerStyles.featureIcon}/>
                   <span className={bannerStyles.featureText}>500+ Doctors</span>
                  </div>
                </div>
                <div className={bannerStyles.ctaButtonsContainer}>
               <button onClick={() => navigate("/doctors")} className={bannerStyles.bookButton}>
                <div className={bannerStyles.bookButtonOverlay}>
         
                </div>
                <div>
                  
                </div>

               </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;