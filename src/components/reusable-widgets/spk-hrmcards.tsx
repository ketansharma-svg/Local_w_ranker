import React, { Fragment } from 'react';
import Spkapexcharts from '../spk-packages/apexcharts-component';

interface SpkHrmcardProps {
    title?: string;
    price?: string;
    percent?: string;
    data?: string;
    color?: string;
    chartOptions?: any;
    chartSeries?: any;
    cardClass?: string;
    icon?: string;
    type?: string;
    width?: string;
    height?: number;
}

const SpkHrmcard: React.FC<SpkHrmcardProps> = ({ title, price, percent, data, color, chartOptions, chartSeries, cardClass = '', icon, type, height, width }) => {

    return (
        <div className='flex flex-row justify-between'>
            <div className="flex flex-col items-start">
                {/* Left: Text */}
                <div>
                    <p className="text-sm text-gray-500 font-medium">Issue Resolved</p>
                    <h2 className="text-3xl font-bold text-gray-800">1140</h2>
                </div>

                {/* Right: Badge & Subtext */}
                <div className="">
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold inline-flex items-center mb-1">
                        <i className="ri-arrow-down-s-fill mr-1 text-sm" />
                        1.5%
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Based on validation or marked fixe</p>
                </div>
            </div>

            <div className="mt-4 h-[60px]">
                <Spkapexcharts
                    chartOptions={chartOptions}
                    chartSeries={chartSeries}
                    type={type}
                    width="100%"
                    height={60}
                />
            </div>

        </div>
    );
};

export default SpkHrmcard;
