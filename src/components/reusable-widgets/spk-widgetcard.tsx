import React, { Fragment } from 'react';
import Spkapexcharts from '../spk-packages/apexcharts-component';

interface SpkwidgetcardcomponentProps {
    cardClass?: string;
    type?: string;
    width?: number;
    height?: number;
    card: Cardprops;
}
interface Cardprops {
    cardClass?: string;
    svgIcon?: React.ReactNode;
    Product?: string;
    price?: string;
    color?: string;
    color1?: string;
    icon1?: string;
    percent?: string;
    // chartoptions?: string;
    // seriesoptions?: number;
    type?: string;
    width?: number;
    height?: number;
    color2?: string;
}

const Spkwidgetcardcomponent: React.FC<SpkwidgetcardcomponentProps> = ({ cardClass, card, type, width, height }) => {
    
    return (
        <Fragment>
             <div className={`box overflow-hidden ${cardClass}`}>
                <div className="box-body">
                    <div className="sm:flex gap-4 items-center flex-wrap">
                        <div className={`avatar avatar-lg bg-${card.color2} svg-white`}>
                                 {card.svgIcon}
                        </div>
                        <div>
                            <div className="flex-auto text-[13px] text-textmuted dark:text-textmuted/50">{card.Product}</div>
                                <div className="text-[21px] font-medium">{card.price}
                                    <span className={`badge bg-${card.color1}/10 !text-${card.color1} text-[10px] ms-2`}>
                                    <i className={`ri-arrow-right-${card.icon1}-line text-[11px]`}></i>{card.percent}
                                    </span>
                                </div>
                        </div>
                        <div className="ms-auto">
                            <div id="chart-01">
                                {/* <Spkapexcharts
                                    chartOptions={card.chartoptions ?? {}}
                                    chartSeries={card.seriesoptions ?? {}}
                                    type={type}
                                    width={width}
                                    height={height}
                                /> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

export default Spkwidgetcardcomponent;
