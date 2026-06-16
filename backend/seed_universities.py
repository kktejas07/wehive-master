"""University seeder — populates the universities_v2 MongoDB collection."""
from __future__ import annotations
import logging

logger = logging.getLogger('wehive.seed_universities')

import asyncio
import re
import uuid
from typing import Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

# Resolve env before importing db
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / '.env')

from db import countries_col, universities_col  # noqa: E402
from data import UNIVERSITIES as _STATIC  # noqa: E402

# ---------------------------------------------------------------------------
# Extra countries to pull from HiPolabs
# ---------------------------------------------------------------------------
EXTRA_COUNTRIES = [
    # (alpha_two_code, country_name, flag, default tuition USD, top universities)
    ('CA', 'Canada',      '🇨🇦', 28000, [
        {'name': 'University of Toronto',            'short_name': 'UofT',     'rank': 21,  'tuition_usd': 45700},
        {'name': 'University of British Columbia',   'short_name': 'UBC',      'rank': 46,  'tuition_usd': 42000},
        {'name': 'McGill University',                'short_name': 'McGill',   'rank': 30,  'tuition_usd': 38000},
        {'name': 'University of Alberta',            'short_name': 'UAlberta', 'rank': 111, 'tuition_usd': 29000},
        {'name': 'McMaster University',              'short_name': 'McMaster', 'rank': 152, 'tuition_usd': 30000},
        {'name': 'University of Waterloo',           'short_name': 'Waterloo', 'rank': 166, 'tuition_usd': 35000},
        {'name': 'University of Montreal',           'short_name': 'UdeM',     'rank': 140, 'tuition_usd': 22000},
        {'name': 'Western University',               'short_name': 'Western',  'rank': 191, 'tuition_usd': 32000},
    ]),
    ('AU', 'Australia',   '🇦🇺', 35000, [
        {'name': 'Australian National University',   'short_name': 'ANU',   'rank': 30,  'tuition_usd': 41000},
        {'name': 'University of Melbourne',          'short_name': 'UMelb', 'rank': 33,  'tuition_usd': 38000},
        {'name': 'University of Sydney',             'short_name': 'USYD',  'rank': 41,  'tuition_usd': 40000},
        {'name': 'University of Queensland',         'short_name': 'UQ',    'rank': 47,  'tuition_usd': 36000},
        {'name': 'Monash University',                'short_name': 'Monash','rank': 57,  'tuition_usd': 35000},
        {'name': 'UNSW Sydney',                      'short_name': 'UNSW',  'rank': 45,  'tuition_usd': 39000},
        {'name': 'University of Adelaide',           'short_name': 'Adelaide','rank': 109, 'tuition_usd': 33000},
        {'name': 'University of Technology Sydney',  'short_name': 'UTS',   'rank': 137, 'tuition_usd': 30000},
    ]),
    ('FR', 'France',      '🇫🇷', 5000, [
        {'name': 'Université PSL',                   'short_name': 'PSL',    'rank': 26,  'tuition_usd': 4000},
        {'name': 'École Polytechnique',              'short_name': 'X',      'rank': 65,  'tuition_usd': 16000},
        {'name': 'Sorbonne University',              'short_name': 'Sorbonne','rank': 83, 'tuition_usd': 3000},
        {'name': 'Sciences Po',                      'short_name': 'SciPo',  'rank': 243, 'tuition_usd': 14000},
        {'name': 'HEC Paris',                        'short_name': 'HEC',    'rank': 120, 'tuition_usd': 45000},
    ]),
    ('NL', 'Netherlands', '🇳🇱', 18000, [
        {'name': 'Delft University of Technology',   'short_name': 'TU Delft','rank': 57,  'tuition_usd': 20000},
        {'name': 'University of Amsterdam',          'short_name': 'UvA',    'rank': 53,  'tuition_usd': 16000},
        {'name': 'Wageningen University',            'short_name': 'WUR',    'rank': 91,  'tuition_usd': 18000},
        {'name': 'Utrecht University',               'short_name': 'UU',     'rank': 106, 'tuition_usd': 17000},
        {'name': 'Leiden University',                'short_name': 'Leiden', 'rank': 122, 'tuition_usd': 16000},
        {'name': 'Erasmus University Rotterdam',     'short_name': 'EUR',    'rank': 176, 'tuition_usd': 16000},
        {'name': 'University of Groningen',          'short_name': 'RUG',    'rank': 159, 'tuition_usd': 17000},
    ]),
    ('IE', 'Ireland',     '🇮🇪', 20000, [
        {'name': 'Trinity College Dublin',           'short_name': 'TCD',    'rank': 81,  'tuition_usd': 25000},
        {'name': 'University College Dublin',        'short_name': 'UCD',    'rank': 181, 'tuition_usd': 22000},
        {'name': 'University College Cork',          'short_name': 'UCC',    'rank': 303, 'tuition_usd': 18000},
        {'name': 'National University of Ireland, Galway', 'short_name': 'NUI Galway', 'rank': 396, 'tuition_usd': 18000},
        {'name': 'University of Limerick',           'short_name': 'UL',     'rank': 501, 'tuition_usd': 17000},
    ]),
    ('SE', 'Sweden',      '🇸🇪', 15000, [
        {'name': 'Lund University',                  'short_name': 'Lund',   'rank': 78,  'tuition_usd': 16000},
        {'name': 'KTH Royal Institute of Technology','short_name': 'KTH',    'rank': 89,  'tuition_usd': 16000},
        {'name': 'Uppsala University',               'short_name': 'Uppsala','rank': 113, 'tuition_usd': 14000},
        {'name': 'Stockholm University',             'short_name': 'SU',     'rank': 188, 'tuition_usd': 12000},
        {'name': 'Chalmers University of Technology','short_name': 'Chalmers','rank': 284, 'tuition_usd': 15000},
        {'name': 'University of Gothenburg',         'short_name': 'GU',     'rank': 187, 'tuition_usd': 13000},
    ]),
    ('SG', 'Singapore',   '🇸🇬', 40000, [
        {'name': 'National University of Singapore', 'short_name': 'NUS',    'rank': 8,   'tuition_usd': 38000},
        {'name': 'Nanyang Technological University', 'short_name': 'NTU',    'rank': 26,  'tuition_usd': 36000},
        {'name': 'Singapore Management University', 'short_name': 'SMU',     'rank': 521, 'tuition_usd': 28000},
    ]),
    ('CH', 'Switzerland', '🇨🇭', 2000, [
        {'name': 'ETH Zurich',                       'short_name': 'ETH',    'rank': 7,   'tuition_usd': 2000},
        {'name': 'EPFL',                             'short_name': 'EPFL',   'rank': 14,  'tuition_usd': 2000},
        {'name': 'University of Zurich',             'short_name': 'UZH',    'rank': 83,  'tuition_usd': 2000},
        {'name': 'University of Bern',               'short_name': 'UniBE',  'rank': 144, 'tuition_usd': 1500},
        {'name': 'University of Geneva',             'short_name': 'UniGE',  'rank': 130, 'tuition_usd': 1500},
        {'name': 'University of Basel',              'short_name': 'UniBS',  'rank': 138, 'tuition_usd': 1500},
        {'name': 'University of Lausanne',           'short_name': 'UNIL',   'rank': 156, 'tuition_usd': 1500},
    ]),
    ('NZ', 'New Zealand', '🇳🇿', 28000, [
        {'name': 'University of Auckland',           'short_name': 'UoA',     'rank': 68,  'tuition_usd': 32000},
        {'name': 'Victoria University of Wellington','short_name': 'VUW',     'rank': 236, 'tuition_usd': 26000},
        {'name': 'University of Otago',              'short_name': 'Otago',   'rank': 206, 'tuition_usd': 27000},
        {'name': 'University of Canterbury',         'short_name': 'UC',      'rank': 284, 'tuition_usd': 25000},
        {'name': 'Massey University',                'short_name': 'Massey',  'rank': 284, 'tuition_usd': 24000},
        {'name': 'University of Waikato',            'short_name': 'Waikato', 'rank': 375, 'tuition_usd': 23000},
        {'name': 'Auckland University of Technology', 'short_name': 'AUT',   'rank': 451, 'tuition_usd': 25000},
    ]),
    ('JP', 'Japan',       '🇯🇵', 12000, [
        {'name': 'University of Tokyo',              'short_name': 'UTokyo',  'rank': 28,  'tuition_usd': 6000},
        {'name': 'Kyoto University',                 'short_name': 'KyotoU',  'rank': 46,  'tuition_usd': 6000},
        {'name': 'Osaka University',                 'short_name': 'OsakaU',  'rank': 80,  'tuition_usd': 6000},
        {'name': 'Tokyo Institute of Technology',    'short_name': 'Tokyo Tech', 'rank': 91, 'tuition_usd': 6000},
        {'name': 'Nagoya University',                'short_name': 'NagoyaU', 'rank': 118, 'tuition_usd': 6000},
        {'name': 'Tohoku University',                'short_name': 'TohokuU', 'rank': 112, 'tuition_usd': 6000},
        {'name': 'Kyushu University',                'short_name': 'KyushuU', 'rank': 135, 'tuition_usd': 6000},
        {'name': 'Hokkaido University',              'short_name': 'HokkaidoU','rank': 180, 'tuition_usd': 6000},
        {'name': 'Keio University',                  'short_name': 'Keio',    'rank': 210, 'tuition_usd': 15000},
        {'name': 'Waseda University',                'short_name': 'Waseda',  'rank': 205, 'tuition_usd': 14000},
    ]),
    ('KR', 'South Korea', '🇰🇷', 10000, [
        {'name': 'Seoul National University',        'short_name': 'SNU',     'rank': 41,  'tuition_usd': 7000},
        {'name': 'Korea Advanced Institute of Science and Technology', 'short_name': 'KAIST', 'rank': 42, 'tuition_usd': 8000},
        {'name': 'Yonsei University',                'short_name': 'Yonsei',  'rank': 76,  'tuition_usd': 16000},
        {'name': 'Korea University',                 'short_name': 'KU',      'rank': 74,  'tuition_usd': 14000},
        {'name': 'Pohang University of Science and Technology', 'short_name': 'POSTECH','rank': 102, 'tuition_usd': 10000},
        {'name': 'Sungkyunkwan University',          'short_name': 'SKKU',    'rank': 97,  'tuition_usd': 12000},
        {'name': 'Hanyang University',               'short_name': 'Hanyang', 'rank': 156, 'tuition_usd': 10000},
    ]),
    ('CN', 'China',       '🇨🇳', 20000, [
        {'name': 'Tsinghua University',              'short_name': 'Tsinghua','rank': 17,  'tuition_usd': 6000},
        {'name': 'Peking University',                'short_name': 'Peking',  'rank': 20,  'tuition_usd': 5000},
        {'name': 'Fudan University',                 'short_name': 'Fudan',   'rank': 34,  'tuition_usd': 5000},
        {'name': 'Zhejiang University',              'short_name': 'ZJU',     'rank': 42,  'tuition_usd': 5000},
        {'name': 'Shanghai Jiao Tong University',    'short_name': 'SJTU',    'rank': 46,  'tuition_usd': 5000},
        {'name': 'University of Science and Technology of China', 'short_name': 'USTC','rank': 98, 'tuition_usd': 4000},
        {'name': 'Nanjing University',               'short_name': 'NJU',     'rank': 124, 'tuition_usd': 4000},
        {'name': 'Wuhan University',                 'short_name': 'WHU',    'rank': 157, 'tuition_usd': 4000},
        {'name': 'Tongji University',                'short_name': 'Tongji', 'rank': 221, 'tuition_usd': 5000},
        {'name': 'Harbin Institute of Technology',   'short_name': 'HIT',    'rank': 239, 'tuition_usd': 4000},
    ]),
    ('HK', 'Hong Kong',   '🇭🇰', 22000, [
        {'name': 'University of Hong Kong',          'short_name': 'HKU',     'rank': 26,  'tuition_usd': 22000},
        {'name': 'Chinese University of Hong Kong',  'short_name': 'CUHK',   'rank': 47,  'tuition_usd': 20000},
        {'name': 'Hong Kong University of Science and Technology', 'short_name': 'HKUST','rank': 60, 'tuition_usd': 22000},
        {'name': 'Hong Kong Polytechnic University', 'short_name': 'PolyU',  'rank': 65,  'tuition_usd': 18000},
        {'name': 'City University of Hong Kong',     'short_name': 'CityU',  'rank': 70,  'tuition_usd': 18000},
        {'name': 'Hong Kong Baptist University',     'short_name': 'HKBU',   'rank': 295, 'tuition_usd': 16000},
    ]),
    ('MY', 'Malaysia',    '🇲🇾', 12000, [
        {'name': 'Universiti Malaya',                'short_name': 'UM',      'rank': 65,  'tuition_usd': 6000},
        {'name': 'Universiti Putra Malaysia',        'short_name': 'UPM',     'rank': 143, 'tuition_usd': 5000},
        {'name': 'Universiti Sains Malaysia',        'short_name': 'USM',     'rank': 165, 'tuition_usd': 5000},
        {'name': 'Universiti Teknologi Malaysia',    'short_name': 'UTM',     'rank': 188, 'tuition_usd': 5000},
        {'name': 'Monash University Malaysia',       'short_name': 'MonashMY','rank': 57,  'tuition_usd': 18000},
        {'name': 'Taylor\'s University',             'short_name': 'Taylor\'s','rank': 379, 'tuition_usd': 10000},
    ]),
    ('TH', 'Thailand',    '🇹🇭', 8000, [
        {'name': 'Chulalongkorn University',         'short_name': 'Chula',   'rank': 215, 'tuition_usd': 8000},
        {'name': 'Mahidol University',               'short_name': 'Mahidol', 'rank': 256, 'tuition_usd': 7000},
        {'name': 'King Mongkut\'s University of Technology Thonburi','short_name':'KMUTT','rank': 501, 'tuition_usd': 6000},
    ]),
    ('VN', 'Vietnam',     '🇻🇳', 6000, [
        {'name': 'Vietnam National University, Hanoi', 'short_name': 'VNU', 'rank': 801, 'tuition_usd': 3000},
        {'name': 'Vietnam National University, Ho Chi Minh City', 'short_name': 'VNU-HCM','rank': 901, 'tuition_usd': 3000},
    ]),
    ('ID', 'Indonesia',   '🇮🇩', 5000, [
        {'name': 'Universitas Indonesia',            'short_name': 'UI',      'rank': 290, 'tuition_usd': 4000},
        {'name': 'Universitas Gadjah Mada',          'short_name': 'UGM',     'rank': 320, 'tuition_usd': 3000},
        {'name': 'Bandung Institute of Technology',  'short_name': 'ITB',     'rank': 401, 'tuition_usd': 3500},
    ]),
    ('PH', 'Philippines', '🇵🇭', 4000, [
        {'name': 'University of the Philippines',    'short_name': 'UP',      'rank': 401, 'tuition_usd': 2000},
        {'name': 'Ateneo de Manila University',      'short_name': 'Ateneo',  'rank': 601, 'tuition_usd': 4000},
        {'name': 'De La Salle University',           'short_name': 'DLSU',    'rank': 801, 'tuition_usd': 4000},
    ]),
    ('TW', 'Taiwan',      '🇹🇼', 10000, [
        {'name': 'National Taiwan University',       'short_name': 'NTU',     'rank': 66,  'tuition_usd': 5000},
        {'name': 'National Tsing Hua University',    'short_name': 'NTHU',    'rank': 182, 'tuition_usd': 4000},
        {'name': 'National Yang Ming Chiao Tung University', 'short_name': 'NYCU','rank': 213, 'tuition_usd': 4000},
        {'name': 'National Cheng Kung University',   'short_name': 'NCKU',    'rank': 234, 'tuition_usd': 4000},
        {'name': 'National Taiwan University of Science and Technology', 'short_name':'NTUST','rank': 401, 'tuition_usd': 4000},
    ]),
    ('AE', 'United Arab Emirates', '🇦🇪', 25000, [
        {'name': 'Khalifa University',               'short_name': 'KU',      'rank': 230, 'tuition_usd': 25000},
        {'name': 'United Arab Emirates University',  'short_name': 'UAEU',    'rank': 278, 'tuition_usd': 20000},
        {'name': 'American University of Sharjah',   'short_name': 'AUS',     'rank': 501, 'tuition_usd': 24000},
    ]),
    ('SA', 'Saudi Arabia', '🇸🇦', 15000, [
        {'name': 'King Saud University',             'short_name': 'KSU',     'rank': 250, 'tuition_usd': 5000},
        {'name': 'King Abdulaziz University',        'short_name': 'KAU',     'rank': 215, 'tuition_usd': 5000},
        {'name': 'King Fahd University of Petroleum and Minerals','short_name':'KFUPM','rank': 331, 'tuition_usd': 6000},
    ]),
    ('IL', 'Israel',      '🇮🇱', 15000, [
        {'name': 'Weizmann Institute of Science',    'short_name': 'Weizmann','rank': 277, 'tuition_usd': 12000},
        {'name': 'Tel Aviv University',              'short_name': 'TAU',     'rank': 301, 'tuition_usd': 13000},
        {'name': 'Hebrew University of Jerusalem',   'short_name': 'HUJI',    'rank': 222, 'tuition_usd': 12000},
        {'name': 'Technion - Israel Institute of Technology', 'short_name': 'Technion','rank': 295, 'tuition_usd': 14000},
    ]),
    ('ZA', 'South Africa', '🇿🇦', 8000, [
        {'name': 'University of Cape Town',          'short_name': 'UCT',     'rank': 170, 'tuition_usd': 8000},
        {'name': 'University of the Witwatersrand',  'short_name': 'Wits',    'rank': 230, 'tuition_usd': 7000},
        {'name': 'Stellenbosch University',           'short_name': 'Stellenbosch','rank': 350, 'tuition_usd': 6000},
        {'name': 'University of Pretoria',           'short_name': 'UP',      'rank': 401, 'tuition_usd': 6000},
        {'name': 'University of Johannesburg',       'short_name': 'UJ',      'rank': 501, 'tuition_usd': 5000},
    ]),
    ('EG', 'Egypt',       '🇪🇬', 5000, [
        {'name': 'Cairo University',                 'short_name': 'Cairo',   'rank': 501, 'tuition_usd': 3000},
        {'name': 'American University in Cairo',     'short_name': 'AUC',     'rank': 601, 'tuition_usd': 15000},
        {'name': 'Alexandria University',            'short_name': 'AlexU',   'rank': 801, 'tuition_usd': 2000},
    ]),
    ('BR', 'Brazil',      '🇧🇷', 5000, [
        {'name': 'Universidade de São Paulo',        'short_name': 'USP',     'rank': 121, 'tuition_usd': 0},
        {'name': 'Universidade Estadual de Campinas','short_name': 'UNICAMP', 'rank': 185, 'tuition_usd': 0},
        {'name': 'Universidade Federal do Rio de Janeiro','short_name': 'UFRJ','rank': 327, 'tuition_usd': 0},
        {'name': 'Universidade Federal de Minas Gerais','short_name':'UFMG','rank': 501, 'tuition_usd': 0},
    ]),
    ('MX', 'Mexico',      '🇲🇽', 6000, [
        {'name': 'Universidad Nacional Autónoma de México', 'short_name': 'UNAM','rank': 105, 'tuition_usd': 1000},
        {'name': 'Instituto Tecnológico y de Estudios Superiores de Monterrey','short_name':'ITESM','rank': 184, 'tuition_usd': 15000},
        {'name': 'Universidad Autónoma Metropolitana','short_name': 'UAM',  'rank': 601, 'tuition_usd': 1000},
    ]),
    ('AR', 'Argentina',   '🇦🇷', 3000, [
        {'name': 'Universidad de Buenos Aires',      'short_name': 'UBA',     'rank': 67,  'tuition_usd': 0},
        {'name': 'Universidad Nacional de La Plata', 'short_name': 'UNLP',    'rank': 401, 'tuition_usd': 0},
        {'name': 'Universidad Nacional de Córdoba',  'short_name': 'UNC',     'rank': 501, 'tuition_usd': 0},
    ]),
    ('CL', 'Chile',       '🇨🇱', 7000, [
        {'name': 'Pontificia Universidad Católica de Chile','short_name':'UC','rank': 146, 'tuition_usd': 8000},
        {'name': 'Universidad de Chile',             'short_name': 'UChile',  'rank': 163, 'tuition_usd': 6000},
        {'name': 'Universidad de Santiago de Chile',  'short_name': 'USACH', 'rank': 501, 'tuition_usd': 5000},
    ]),
    ('CO', 'Colombia',    '🇨🇴', 5000, [
        {'name': 'Universidad de los Andes',          'short_name': 'UniAndes','rank': 191, 'tuition_usd': 10000},
        {'name': 'Universidad Nacional de Colombia',  'short_name': 'UNAL',  'rank': 201, 'tuition_usd': 3000},
        {'name': 'Pontificia Universidad Javeriana',  'short_name': 'Javeriana','rank': 401, 'tuition_usd': 8000},
    ]),
    ('NO', 'Norway',      '🇳🇴', 10000, [
        {'name': 'University of Oslo',               'short_name': 'UiO',     'rank': 118, 'tuition_usd': 10000},
        {'name': 'University of Bergen',             'short_name': 'UiB',     'rank': 278, 'tuition_usd': 9000},
        {'name': 'Norwegian University of Science and Technology','short_name':'NTNU','rank': 330, 'tuition_usd': 10000},
    ]),
    ('DK', 'Denmark',     '🇩🇰', 16000, [
        {'name': 'University of Copenhagen',         'short_name': 'KU',      'rank': 81,  'tuition_usd': 16000},
        {'name': 'Technical University of Denmark',  'short_name': 'DTU',     'rank': 103, 'tuition_usd': 20000},
        {'name': 'Aarhus University',                'short_name': 'AU',      'rank': 89,  'tuition_usd': 15000},
    ]),
    ('FI', 'Finland',     '🇫🇮', 14000, [
        {'name': 'University of Helsinki',           'short_name': 'HY',      'rank': 104, 'tuition_usd': 14000},
        {'name': 'Aalto University',                 'short_name': 'Aalto',   'rank': 112, 'tuition_usd': 16000},
        {'name': 'University of Turku',              'short_name': 'UTU',     'rank': 315, 'tuition_usd': 12000},
    ]),
    ('BE', 'Belgium',     '🇧🇪', 7000, [
        {'name': 'KU Leuven',                        'short_name': 'KUL',     'rank': 50,  'tuition_usd': 6000},
        {'name': 'Ghent University',                'short_name': 'UGent',   'rank': 143, 'tuition_usd': 5000},
        {'name': 'Université Catholique de Louvain', 'short_name': 'UCLouvain','rank': 185, 'tuition_usd': 5000},
        {'name': 'Université Libre de Bruxelles',    'short_name': 'ULB',     'rank': 201, 'tuition_usd': 5000},
    ]),
    ('AT', 'Austria',     '🇦🇹', 2000, [
        {'name': 'University of Vienna',             'short_name': 'UniWien', 'rank': 145, 'tuition_usd': 2000},
        {'name': 'TU Wien',                          'short_name': 'TU Wien', 'rank': 180, 'tuition_usd': 2000},
        {'name': 'Johannes Kepler University Linz',  'short_name': 'JKU',    'rank': 401, 'tuition_usd': 2000},
    ]),
    ('HU', 'Hungary',     '🇭🇺', 6000, [
        {'name': 'Eötvös Loránd University',         'short_name': 'ELTE',    'rank': 501, 'tuition_usd': 6000},
        {'name': 'Budapest University of Technology and Economics','short_name':'BME','rank': 801, 'tuition_usd': 5000},
        {'name': 'Semmelweis University',            'short_name': 'Semmelweis','rank': 601, 'tuition_usd': 8000},
    ]),
    ('CZ', 'Czech Republic', '🇨🇿', 8000, [
        {'name': 'Charles University',               'short_name': 'CUNI',    'rank': 248, 'tuition_usd': 8000},
        {'name': 'Czech Technical University in Prague','short_name': 'CTU',  'rank': 401, 'tuition_usd': 6000},
        {'name': 'Masaryk University',               'short_name': 'MUNI',    'rank': 501, 'tuition_usd': 6000},
    ]),
    ('PL', 'Poland',      '🇵🇱', 6000, [
        {'name': 'University of Warsaw',             'short_name': 'UW',      'rank': 262, 'tuition_usd': 5000},
        {'name': 'Jagiellonian University',          'short_name': 'JU',      'rank': 304, 'tuition_usd': 5000},
        {'name': 'Warsaw University of Technology',  'short_name': 'PW',      'rank': 501, 'tuition_usd': 5000},
        {'name': 'AGH University of Science and Technology','short_name':'AGH','rank': 801, 'tuition_usd': 4000},
    ]),
    ('TR', 'Turkey',      '🇹🇷', 8000, [
        {'name': 'Koç University',                   'short_name': 'KU',      'rank': 431, 'tuition_usd': 20000},
        {'name': 'Sabancı University',               'short_name': 'SU',      'rank': 501, 'tuition_usd': 18000},
        {'name': 'Boğaziçi University',              'short_name': 'Boun',    'rank': 601, 'tuition_usd': 5000},
        {'name': 'Istanbul Technical University',    'short_name': 'ITU',     'rank': 601, 'tuition_usd': 5000},
        {'name': 'Middle East Technical University', 'short_name': 'METU',    'rank': 601, 'tuition_usd': 5000},
    ]),
    ('RU', 'Russia',      '🇷🇺', 6000, [
        {'name': 'Lomonosov Moscow State University', 'short_name': 'MSU',    'rank': 75,  'tuition_usd': 6000},
        {'name': 'Saint Petersburg State University', 'short_name': 'SPbSU',  'rank': 234, 'tuition_usd': 5000},
        {'name': 'Novosibirsk State University',     'short_name': 'NSU',     'rank': 260, 'tuition_usd': 4000},
        {'name': 'Moscow Institute of Physics and Technology','short_name':'MIPT','rank': 281, 'tuition_usd': 5000},
        {'name': 'Higher School of Economics',        'short_name': 'HSE',    'rank': 305, 'tuition_usd': 6000},
    ]),
    ('UA', 'Ukraine',     '🇺🇦', 4000, [
        {'name': 'Taras Shevchenko National University of Kyiv','short_name':'KNU','rank': 601, 'tuition_usd': 3000},
        {'name': 'Igor Sikorsky Kyiv Polytechnic Institute','short_name':'KPI','rank': 801, 'tuition_usd': 3000},
    ]),
    ('RO', 'Romania',     '🇷🇴', 4000, [
        {'name': 'Babeș-Bolyai University',          'short_name': 'UBB',     'rank': 801, 'tuition_usd': 3000},
        {'name': 'University of Bucharest',          'short_name': 'UniBuc',  'rank': 801, 'tuition_usd': 3000},
    ]),
    ('GR', 'Greece',      '🇬🇷', 6000, [
        {'name': 'National and Kapodistrian University of Athens','short_name':'NKUA','rank': 320, 'tuition_usd': 4000},
        {'name': 'Aristotle University of Thessaloniki','short_name':'AUTH', 'rank': 401, 'tuition_usd': 3500},
        {'name': 'National Technical University of Athens','short_name':'NTUA','rank': 401, 'tuition_usd': 4000},
    ]),
    ('PT', 'Portugal',    '🇵🇹', 7000, [
        {'name': 'University of Lisbon',             'short_name': 'ULisboa', 'rank': 301, 'tuition_usd': 6000},
        {'name': 'University of Porto',              'short_name': 'UPorto',  'rank': 281, 'tuition_usd': 5000},
        {'name': 'University of Coimbra',            'short_name': 'UC',      'rank': 401, 'tuition_usd': 5000},
    ]),
    ('HR', 'Croatia',     '🇭🇷', 6000, [
        {'name': 'University of Zagreb',             'short_name': 'UNIZG',   'rank': 401, 'tuition_usd': 5000},
        {'name': 'University of Split',              'short_name': 'UNIST',   'rank': 801, 'tuition_usd': 4000},
        {'name': 'University of Rijeka',             'short_name': 'UNIRI',   'rank': 801, 'tuition_usd': 4000},
    ]),
    ('BG', 'Bulgaria',    '🇧🇬', 5000, [
        {'name': 'Sofia University',                 'short_name': 'SU',      'rank': 801, 'tuition_usd': 5000},
        {'name': 'Technical University of Sofia',    'short_name': 'TUS',     'rank': 1001,'tuition_usd': 4000},
    ]),
    ('IN', 'India',       '🇮🇳', 8000, [
        {'name': 'Indian Institute of Technology Bombay','short_name':'IITB','rank': 149, 'tuition_usd': 4000},
        {'name': 'Indian Institute of Technology Delhi','short_name':'IITD','rank': 174, 'tuition_usd': 4000},
        {'name': 'Indian Institute of Science',       'short_name': 'IISc',   'rank': 186, 'tuition_usd': 3000},
        {'name': 'Indian Institute of Technology Madras','short_name':'IITM','rank': 231, 'tuition_usd': 4000},
        {'name': 'Indian Institute of Technology Kharagpur','short_name':'IITKGP','rank': 270, 'tuition_usd': 4000},
        {'name': 'Indian Institute of Technology Kanpur','short_name':'IITK','rank': 278, 'tuition_usd': 4000},
        {'name': 'Indian Institute of Technology Roorkee','short_name':'IITR','rank': 319, 'tuition_usd': 4000},
        {'name': 'University of Delhi',               'short_name': 'DU',     'rank': 501, 'tuition_usd': 2000},
        {'name': 'Jawaharlal Nehru University',       'short_name': 'JNU',    'rank': 601, 'tuition_usd': 1500},
        {'name': 'University of Hyderabad',           'short_name': 'UoH',    'rank': 601, 'tuition_usd': 2000},
        {'name': 'Anna University',                   'short_name': 'AU',     'rank': 601, 'tuition_usd': 2000},
        {'name': 'Vellore Institute of Technology',   'short_name': 'VIT',    'rank': 801, 'tuition_usd': 5000},
        {'name': 'Manipal Academy of Higher Education','short_name':'Manipal','rank': 801, 'tuition_usd': 6000},
    ]),
    ('ES', 'Spain',       '🇪🇸', 7000, [
        {'name': 'University of Barcelona',           'short_name': 'UB',     'rank': 180, 'tuition_usd': 4000},
        {'name': 'Autonomous University of Madrid',  'short_name': 'UAM',    'rank': 210, 'tuition_usd': 4000},
        {'name': 'University of Valencia',            'short_name': 'UV',     'rank': 230, 'tuition_usd': 3500},
        {'name': 'Complutense University of Madrid',  'short_name': 'UCM',    'rank': 240, 'tuition_usd': 3500},
        {'name': 'Pompeu Fabra University',           'short_name': 'UPF',    'rank': 240, 'tuition_usd': 5000},
        {'name': 'University of Granada',             'short_name': 'UGR',    'rank': 290, 'tuition_usd': 3500},
        {'name': 'University of Seville',             'short_name': 'US',     'rank': 310, 'tuition_usd': 3000},
    ]),
    ('IT', 'Italy',       '🇮🇹', 5000, [
        {'name': 'University of Bologna',            'short_name': 'Unibo',   'rank': 154, 'tuition_usd': 4000},
        {'name': 'Sapienza University of Rome',      'short_name': 'Sapienza','rank': 169, 'tuition_usd': 3000},
        {'name': 'University of Padua',              'short_name': 'Unipd',   'rank': 219, 'tuition_usd': 4000},
        {'name': 'Politecnico di Milano',            'short_name': 'Polimi',  'rank': 137, 'tuition_usd': 4000},
        {'name': 'University of Milan',              'short_name': 'Unimi',   'rank': 200, 'tuition_usd': 3000},
        {'name': 'University of Trento',             'short_name': 'Unitn',   'rank': 390, 'tuition_usd': 3000},
    ]),
    ('DE', 'Germany',     '🇩🇪', 2000, [
        {'name': 'Technical University of Munich',   'short_name': 'TUM',     'rank': 37,  'tuition_usd': 2000},
        {'name': 'Ludwig Maximilian University of Munich','short_name':'LMU','rank': 59, 'tuition_usd': 1500},
        {'name': 'Heidelberg University',             'short_name': 'Heidelberg','rank': 64, 'tuition_usd': 1500},
        {'name': 'Free University of Berlin',         'short_name': 'FU Berlin','rank': 114, 'tuition_usd': 1500},
        {'name': 'Humboldt University of Berlin',     'short_name': 'HU Berlin','rank': 117, 'tuition_usd': 1500},
        {'name': 'RWTH Aachen University',            'short_name': 'RWTH',   'rank': 120, 'tuition_usd': 2000},
        {'name': 'University of Freiburg',           'short_name': 'Uni Freiburg','rank': 135, 'tuition_usd': 1500},
        {'name': 'University of Tübingen',           'short_name': 'Uni Tübingen','rank': 138, 'tuition_usd': 1500},
        {'name': 'Karlsruhe Institute of Technology', 'short_name': 'KIT',    'rank': 144, 'tuition_usd': 2000},
        {'name': 'Hamburg University of Technology', 'short_name': 'TUHH',   'rank': 401, 'tuition_usd': 2000},
    ]),
    ('GB', 'United Kingdom', '🇬🇧', 28000, [
        {'name': 'University of Oxford',             'short_name': 'Oxford',  'rank': 3,   'tuition_usd': 38000},
        {'name': 'University of Cambridge',          'short_name': 'Cambridge','rank': 2,  'tuition_usd': 37000},
        {'name': 'Imperial College London',           'short_name': 'Imperial','rank': 6,  'tuition_usd': 40000},
        {'name': 'University College London',         'short_name': 'UCL',    'rank': 8,   'tuition_usd': 36000},
        {'name': 'University of Edinburgh',           'short_name': 'Edinburgh','rank': 15, 'tuition_usd': 30000},
        {'name': 'King\'s College London',            'short_name': 'KCL',    'rank': 37,  'tuition_usd': 32000},
        {'name': 'University of Manchester',          'short_name': 'Manchester','rank': 27, 'tuition_usd': 28000},
        {'name': 'University of Warwick',             'short_name': 'Warwick', 'rank': 61,  'tuition_usd': 29000},
        {'name': 'University of Bristol',             'short_name': 'Bristol', 'rank': 57,  'tuition_usd': 27000},
        {'name': 'University of Glasgow',             'short_name': 'Glasgow', 'rank': 73,  'tuition_usd': 26000},
        {'name': 'University of Southampton',         'short_name': 'Southampton','rank': 77,'tuition_usd': 26000},
        {'name': 'University of Birmingham',           'short_name': 'Birmingham','rank': 84, 'tuition_usd': 26000},
        {'name': 'University of Leeds',               'short_name': 'Leeds',   'rank': 86,  'tuition_usd': 25000},
        {'name': 'University of Sheffield',           'short_name': 'Sheffield','rank': 93,  'tuition_usd': 25000},
        {'name': 'University of Nottingham',          'short_name': 'Nottingham','rank': 103, 'tuition_usd': 26000},
        {'name': 'Queen Mary University of London',   'short_name': 'QMUL',   'rank': 117, 'tuition_usd': 28000},
        {'name': 'Lancaster University',             'short_name': 'Lancaster','rank': 132, 'tuition_usd': 24000},
        {'name': 'Newcastle University',              'short_name': 'Newcastle','rank': 139, 'tuition_usd': 24000},
        {'name': 'University of York',                'short_name': 'York',    'rank': 150, 'tuition_usd': 24000},
        {'name': 'University of Exeter',              'short_name': 'Exeter',  'rank': 153, 'tuition_usd': 25000},
        {'name': 'University of Liverpool',           'short_name': 'Liverpool','rank': 181, 'tuition_usd': 24000},
        {'name': 'University of St Andrews',          'short_name': 'St Andrews','rank': 96, 'tuition_usd': 30000},
        {'name': 'Durham University',                 'short_name': 'Durham',  'rank': 82,  'tuition_usd': 28000},
        {'name': 'University of Leicester',           'short_name': 'Leicester','rank': 201, 'tuition_usd': 22000},
        {'name': 'Cardiff University',                'short_name': 'Cardiff', 'rank': 166, 'tuition_usd': 23000},
        {'name': 'University of Bath',                'short_name': 'Bath',    'rank': 173, 'tuition_usd': 26000},
        {'name': 'University of Aberdeen',            'short_name': 'Aberdeen','rank': 194, 'tuition_usd': 24000},
        {'name': 'University of Reading',             'short_name': 'Reading', 'rank': 199, 'tuition_usd': 23000},
        {'name': 'University of Sussex',              'short_name': 'Sussex',  'rank': 216, 'tuition_usd': 23000},
        {'name': 'Loughborough University',           'short_name': 'Loughborough','rank': 220, 'tuition_usd': 24000},
    ]),
    ('US', 'United States', '🇺🇸', 40000, [
        {'name': 'Massachusetts Institute of Technology','short_name':'MIT','rank':1,'tuition_usd':55790},
        {'name': 'Harvard University',                 'short_name':'Harvard','rank':2,'tuition_usd':55807},
        {'name': 'Stanford University',                'short_name':'Stanford','rank':3,'tuition_usd':56169},
        {'name': 'California Institute of Technology', 'short_name':'Caltech','rank':7,'tuition_usd':58890},
        {'name': 'University of California Berkeley',  'short_name':'UC Berkeley','rank':15,'tuition_usd':44300},
        {'name': 'University of Pennsylvania',         'short_name':'UPenn','rank':8,'tuition_usd':63700},
        {'name': 'Cornell University',                 'short_name':'Cornell','rank':12,'tuition_usd':63400},
        {'name': 'Columbia University',                'short_name':'Columbia','rank':6,'tuition_usd':65340},
        {'name': 'Princeton University',               'short_name':'Princeton','rank':4,'tuition_usd':57410},
        {'name': 'Yale University',                    'short_name':'Yale','rank':5,'tuition_usd':62250},
        {'name': 'University of Chicago',              'short_name':'UChicago','rank':10,'tuition_usd':63500},
        {'name': 'Johns Hopkins University',           'short_name':'JHU','rank':13,'tuition_usd':62200},
        {'name': 'University of California Los Angeles','short_name':'UCLA','rank':14,'tuition_usd':44200},
        {'name': 'University of Michigan Ann Arbor',   'short_name':'UMich','rank':21,'tuition_usd':55200},
        {'name': 'Northwestern University',            'short_name':'Northwestern','rank':9,'tuition_usd':62300},
        {'name': 'New York University',                'short_name':'NYU','rank':25,'tuition_usd':58600},
        {'name': 'Carnegie Mellon University',         'short_name':'CMU','rank':22,'tuition_usd':61800},
        {'name': 'University of Texas at Austin',      'short_name':'UT Austin','rank':32,'tuition_usd':40500},
        {'name': 'University of Illinois Urbana-Champaign','short_name':'UIUC','rank':35,'tuition_usd':36500},
        {'name': 'University of Washington',           'short_name':'UW','rank':26,'tuition_usd':40000},
        {'name': 'Georgia Institute of Technology',    'short_name':'Georgia Tech','rank':33,'tuition_usd':31400},
        {'name': 'University of California San Diego', 'short_name':'UCSD','rank':34,'tuition_usd':44400},
        {'name': 'University of Florida',              'short_name':'UF','rank':30,'tuition_usd':28600},
        {'name': 'University of Southern California',  'short_name':'USC','rank':23,'tuition_usd':62400},
        {'name': 'Boston University',                  'short_name':'BU','rank':41,'tuition_usd':60800},
        {'name': 'Purdue University',                  'short_name':'Purdue','rank':43,'tuition_usd':28800},
        {'name': 'Pennsylvania State University',      'short_name':'Penn State','rank':57,'tuition_usd':37500},
        {'name': 'Ohio State University',              'short_name':'OSU','rank':40,'tuition_usd':36500},
        {'name': 'University of Maryland College Park','short_name':'UMD','rank':46,'tuition_usd':39500},
        {'name': 'University of Pittsburgh',           'short_name':'Pitt','rank':42,'tuition_usd':34700},
        {'name': 'University of California Davis',     'short_name':'UC Davis','rank':38,'tuition_usd':44300},
        {'name': 'Texas A&M University',               'short_name':'Texas A&M','rank':67,'tuition_usd':31000},
        {'name': 'University of Minnesota Twin Cities','short_name':'UMN','rank':55,'tuition_usd':34000},
        {'name': 'University of Wisconsin Madison',    'short_name':'UW Madison','rank':51,'tuition_usd':38000},
        {'name': 'Michigan State University',          'short_name':'MSU','rank':80,'tuition_usd':35500},
        {'name': 'Duke University',                    'short_name':'Duke','rank':16,'tuition_usd':63000},
        {'name': 'University of Notre Dame',           'short_name':'Notre Dame','rank':19,'tuition_usd':61000},
        {'name': 'Rice University',                    'short_name':'Rice','rank':17,'tuition_usd':54560},
        {'name': 'Brown University',                   'short_name':'Brown','rank':14,'tuition_usd':65100},
        {'name': 'Dartmouth College',                  'short_name':'Dartmouth','rank':12,'tuition_usd':63000},
        {'name': 'Vanderbilt University',              'short_name':'Vanderbilt','rank':18,'tuition_usd':60000},
        {'name': 'University of Rochester',            'short_name':'Rochester','rank':47,'tuition_usd':61000},
        {'name': 'Arizona State University',           'short_name':'ASU','rank':103,'tuition_usd':33900},
        {'name': 'University of Arizona',              'short_name':'UArizona','rank':94,'tuition_usd':36100},
        {'name': 'University of Utah',                 'short_name':'Utah','rank':133,'tuition_usd':30000},
        {'name': 'University of Colorado Boulder',     'short_name':'CU Boulder','rank':112,'tuition_usd':38000},
        {'name': 'Stony Brook University',             'short_name':'Stony Brook','rank':77,'tuition_usd':28700},
        {'name': 'University of Massachusetts Amherst','short_name':'UMass','rank':68,'tuition_usd':36500},
        {'name': 'University of Connecticut',          'short_name':'UConn','rank':58,'tuition_usd':42000},
        {'name': 'University of Oregon',               'short_name':'UOregon','rank':99,'tuition_usd':35900},
        {'name': 'University of Iowa',                  'short_name':'Iowa','rank':93,'tuition_usd':32000},
        {'name': 'University of Kansas',               'short_name':'Kansas','rank':124,'tuition_usd':29000},
        {'name': 'University of Alabama',              'short_name':'Alabama','rank':130,'tuition_usd':32000},
    ]),
]

_TOP_MAP: dict[str, dict] = {}
for _cc, _cn, _fl, _dt, _tops in EXTRA_COUNTRIES:
    for _t in _tops:
        _TOP_MAP[(_cc.lower(), _normalize := _t['name'].lower())] = _t


def _slug(name: str, country: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', f"{country}-{name}".lower()).strip('-')


def _enrich_hipolabs(raw: dict, country_code: str, country_name: str, flag: str,
                     default_tuition: int, top_override: Optional[dict] = None) -> dict:
    name = raw['name']
    short_name = (raw.get('short_name') or name.split()[-1])[:20]
    rank = (top_override or {}).get('rank', 999)
    tuition = (top_override or {}).get('tuition_usd', default_tuition)
    loc = raw.get('state-province') or country_name
    web = (raw.get('web_pages') or [''])[0]
    return {
        'id': _slug(name, country_code),
        'name': name,
        'short_name': short_name,
        'country': country_code.lower(),
        'country_name': country_name,
        'flag': flag,
        'rank': rank,
        'qs_rank': rank,
        'times_rank': rank,
        'type': 'Public',
        'established': 1900,
        'students': 15000,
        'intl_students': 2000,
        'tuition_usd': tuition,
        'living_cost_usd': 15000,
        'scholarships': rank <= 200,
        'courses': ['stem', 'engineering', 'business', 'arts', 'social'],
        'popular_courses': ['Computer Science', 'Engineering', 'Business Administration', 'Arts', 'Social Sciences'],
        'intakes': ['Sep', 'Jan'],
        'gre_required': False,
        'gmat_required': False,
        'ielts_min': 6.5,
        'toefl_min': 90,
        'acceptance_rate': '50%',
        'employment_rate': '85%',
        'avg_salary_usd': 55000,
        'description': f'A leading university in {country_name} offering world-class education.',
        'location': loc,
        'website': web,
        'accreditation': [],
        'facilities': ['Library', 'Sports Complex', 'Research Labs'],
        '_source': 'hipolabs',
    }


async def fetch_hipolabs(country_name: str, timeout: float = 15.0) -> list[dict]:
    url = f'http://universities.hipolabs.com/search?country={country_name}'
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


async def seed() -> dict:
    # --- 1. Upsert static data (dedup by name+country) ------------------------
    static_count = 0
    seen_names: set[tuple[str, str]] = set()
    for u in _STATIC:
        name_key = ((u.get('name') or '').strip().lower(), (u.get('country') or '').strip().lower())
        if name_key in seen_names:
            continue
        seen_names.add(name_key)
        doc = {**u, '_source': 'static'}
        await universities_col.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
        static_count += 1

    # --- 2. Pull new countries from HiPolabs ---------------------------------
    # Normalize static country codes (e.g. 'uk') to ISO alpha-2 (e.g. 'gb')
    COUNTRY_CODE_MAP = {'uk': 'gb'}
    api_count = 0
    extra_codes = set()
    for country_code, country_name, flag, default_tuition, top_list in EXTRA_COUNTRIES:
        extra_codes.add(country_code.lower())
        cc_lower = country_code.lower()
        # Also look up any aliased country codes from static data
        cc_aliases = [k for k, v in COUNTRY_CODE_MAP.items() if v == cc_lower]
        cc_query = {'$in': [cc_lower] + cc_aliases}
        existing = await universities_col.count_documents({'country': cc_query})
        if existing >= len(top_list):
            raw_list = []
        else:
            try:
                raw_list = await fetch_hipolabs(country_name)
            except Exception as exc:
                logger.warning("HiPolabs fetch failed for %s: %s", country_name, exc)
                raw_list = []

        top_names = {t['name'].lower(): t for t in top_list}

        # Pre-fetch existing names in this country (including aliased codes) for dedup
        existing_names = set()
        async for u in universities_col.find({'country': cc_query}, {'name': 1}):
            existing_names.add((u.get('name') or '').strip().lower())

        for raw in raw_list:
            name_lower = raw['name'].lower()
            if name_lower in existing_names:
                api_count += 1
                continue
            top_override = top_names.get(name_lower)
            doc = _enrich_hipolabs(raw, cc_lower, country_name, flag, default_tuition, top_override)
            await universities_col.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            api_count += 1
            existing_names.add(name_lower)

        # Ensure top-ranked entries exist even if HiPolabs didn't return them
        for top in top_list:
            top_name = top['name'].strip().lower()
            if top_name in existing_names:
                continue
            doc_id = _slug(top['name'], cc_lower)
            enriched = _enrich_hipolabs(
                {'name': top['name'], 'state-province': None, 'web_pages': []},
                cc_lower, country_name, flag, default_tuition, top,
            )
            enriched['short_name'] = top.get('short_name', enriched['short_name'])
            await universities_col.update_one({'id': doc_id}, {'$set': enriched}, upsert=True)
            api_count += 1
            existing_names.add(top_name)

    # --- 3. Pull all remaining countries from HiPolabs -----------------------
    try:
        all_raw = await fetch_hipolabs('')  # empty = all countries
    except Exception as exc:
        logger.warning("HiPolabs fetch failed for remaining countries: %s", exc)
        all_raw = []
    remaining_by_country: dict[str, list[dict]] = {}
    for u in all_raw:
        cc = (u.get('alpha_two_code') or '').lower()
        if cc and cc not in extra_codes:
            remaining_by_country.setdefault(cc, []).append(u)

    for cc, unis in remaining_by_country.items():
        unis.sort(key=lambda x: x.get('name', ''))
        existing_names = set()
        async for u in universities_col.find({'country': cc}, {'name': 1}):
            existing_names.add((u.get('name') or '').strip().lower())
        for raw in unis:
            name_lower = raw['name'].lower()
            if name_lower in existing_names:
                continue
            doc = _enrich_hipolabs(
                raw, cc, raw.get('country', cc.upper()),
                '\U0001F30D', 12000,  # globe emoji, default tuition
            )
            await universities_col.update_one({'id': doc['id']}, {'$set': doc}, upsert=True)
            api_count += 1
            existing_names.add(name_lower)

    total = await universities_col.count_documents({})
    return {'static': static_count, 'api': api_count, 'total': total}


if __name__ == '__main__':
    async def main():
        result = await seed()
        print(result)
    asyncio.run(main())
