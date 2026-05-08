const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');
const Lawyer = require('../models/Lawyer');
const Client = require('../models/Client');
const Volunteer = require('../models/Volunteer');
const Appointment = require('../models/Appointment');
const ForumPost = require('../models/ForumPost');
const MasterLawyer = require('../models/MasterLawyer');
const MasterVolunteer = require('../models/MasterVolunteer');
const MasterProBono = require('../models/MasterProBono');

dotenv.config();

/**
 * Database seeding script for development
 * Creates initial data for testing
 */
const seedDatabase = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('📦 Connected to database for seeding');

        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Lawyer.deleteMany({}),
            Client.deleteMany({}),
            Volunteer.deleteMany({}),
            Appointment.deleteMany({}),
            ForumPost.deleteMany({}),
            MasterLawyer.deleteMany({}),
            MasterVolunteer.deleteMany({}),
            MasterProBono.deleteMany({})
        ]);

        console.log('🧹 Cleared existing data');

        // Use plain text — the User model's pre-save hook will hash it automatically
        const seedPassword = 'Admin@123456';
        const admin = await User.create({
            username: 'admin',
            email: 'admin@legalassistance.et',
            phone: '+251911111111',
            password: seedPassword,
            userType: 'ADMIN',
            fullName: 'System Administrator',
            isVerified: true,
            languagePreference: 'English'
        });

        console.log('✅ Admin created:', admin.email);

        // Create lawyer users
        const lawyer1 = await User.create({
            username: 'tesfaye',
            email: 'tesfaye@legalassistance.et',
            phone: '+251922222222',
            password: seedPassword,
            userType: 'LAWYER',
            fullName: 'Tesfaye Bezabih',
            region: 'Addis Ababa',
            city: 'Bole',
            isVerified: true,
            languagePreference: 'Amharic'
        });

        const lawyer2 = await User.create({
            username: 'alemu',
            email: 'alemu@legalassistance.et',
            phone: '+251933333333',
            password: seedPassword,
            userType: 'LAWYER',
            fullName: 'Alemu Bekele',
            region: 'Addis Ababa',
            city: 'Kirkos',
            isVerified: true,
            languagePreference: 'English'
        });

        // Create lawyer profiles
        await Lawyer.create({
            userId: lawyer1._id,
            licenseNumber: 'LAW-2020-001',
            specialization: ['FAMILY_LAW', 'CRIMINAL_LAW'],
            experience: 15,
            languages: ['Amharic', 'English'],
            consultationFee: { amount: 2000, currency: 'ETB' },
            proBono: { available: true, casesPerYear: 5 },
            verificationStatus: 'VERIFIED',
            verifiedBy: admin._id,
            verifiedAt: new Date(),
            rating: 4.8,
            bio: 'Experienced family and criminal lawyer with 15 years of practice in Ethiopian courts.'
        });

        await Lawyer.create({
            userId: lawyer2._id,
            licenseNumber: 'LAW-2018-002',
            specialization: ['COMMERCIAL_LAW', 'CONTRACT_LAW'],
            experience: 10,
            languages: ['English', 'Amharic'],
            consultationFee: { amount: 3000, currency: 'ETB' },
            proBono: { available: false },
            verificationStatus: 'VERIFIED',
            verifiedBy: admin._id,
            verifiedAt: new Date(),
            rating: 4.6,
            bio: 'Commercial lawyer specializing in business contracts and corporate law.'
        });

        console.log('✅ Lawyers created');

        // Create client users
        const client1 = await User.create({
            username: 'abebe',
            email: 'abebe@gmail.com',
            phone: '+251944444444',
            password: seedPassword,
            userType: 'CLIENT',
            fullName: 'Abebe Belachew',
            region: 'Addis Ababa',
            city: 'Bole',
            isVerified: true
        });

        const client2 = await User.create({
            username: 'aster',
            email: 'aster@gmail.com',
            phone: '+251955555555',
            password: seedPassword,
            userType: 'CLIENT',
            fullName: 'Aster Tadesse',
            region: 'Addis Ababa',
            city: 'Kirkos',
            isVerified: true
        });

        // Create client profiles
        await Client.create({
            userId: client1._id,
            occupation: 'Teacher',
            incomeLevel: 'MEDIUM',
            legalAidEligible: false,
            preferredCommunication: 'PHONE'
        });

        await Client.create({
            userId: client2._id,
            occupation: 'Business Owner',
            incomeLevel: 'HIGH',
            legalAidEligible: false,
            preferredCommunication: 'EMAIL'
        });

        console.log('✅ Clients created');

        // Create volunteer users
        const volunteer1 = await User.create({
            username: 'mekdes',
            email: 'mekdes@university.edu.et',
            phone: '+251966666666',
            password: seedPassword,
            userType: 'VOLUNTEER_ADVISOR',
            fullName: 'Mekdes Mulatu',
            region: 'Addis Ababa',
            city: 'Bole',
            isVerified: true
        });

        const volunteer2 = await User.create({
            username: 'dagim',
            email: 'dagim@legalaid.et',
            phone: '+251977777777',
            password: seedPassword,
            userType: 'VOLUNTEER_REPRESENTATIVE',
            fullName: 'Dagimawit Anbesaw',
            region: 'Addis Ababa',
            city: 'Kirkos',
            isVerified: true
        });

        // Create volunteer profiles
        await Volunteer.create({
            userId: volunteer1._id,
            volunteerType: 'ADVISOR',
            expertise: ['FAMILY_LAW', 'LABOR_LAW'],
            qualifications: {
                education: 'LAW_STUDENT',
                institution: 'Addis Ababa University',
                yearOfStudy: 4
            },
            supervisor: {
                name: 'Dr. Tadesse',
                contact: '+251988888888',
                organization: 'AAU Law School'
            },
            status: 'APPROVED',
            approvedBy: admin._id,
            approvedAt: new Date()
        });

        await Volunteer.create({
            userId: volunteer2._id,
            volunteerType: 'REPRESENTATIVE',
            expertise: ['CIVIL_LAW', 'HUMAN_RIGHTS'],
            qualifications: {
                education: 'LAW_GRADUATE',
                institution: 'Addis Ababa University',
                graduationYear: 2020
            },
            authorizationStatus: 'AUTHORIZED',
            authorizationNumber: 'AUTH-2023-001',
            authorizationExpiry: new Date('2025-12-31'),
            status: 'APPROVED',
            approvedBy: admin._id,
            approvedAt: new Date()
        });

        console.log('✅ Volunteers created');

        // Create sample appointments
        await Appointment.create({
            clientId: client1._id,
            lawyerId: lawyer1._id,
            appointmentType: 'CONSULTATION',
            title: 'Family Law Consultation',
            description: 'Discussing divorce proceedings',
            caseType: 'FAMILY_LAW',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            startTime: '10:00',
            endTime: '11:00',
            location: { type: 'VIDEO_CALL', meetingLink: 'https://meet.google.com/abc-defg-hij' },
            status: 'CONFIRMED',
            createdBy: client1._id
        });

        await Appointment.create({
            clientId: client2._id,
            lawyerId: lawyer2._id,
            appointmentType: 'CONSULTATION',
            title: 'Business Contract Review',
            description: 'Reviewing partnership agreement',
            caseType: 'COMMERCIAL_LAW',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            startTime: '14:00',
            endTime: '15:00',
            location: { type: 'IN_PERSON', address: 'Bole, Addis Ababa' },
            status: 'SCHEDULED',
            createdBy: client2._id
        });

        console.log('✅ Appointments created');

        // Create sample forum posts
        await ForumPost.create({
            authorId: client1._id,
            authorName: 'Abebe Belachew',
            authorType: 'CLIENT',
            title: 'How to file for divorce in Ethiopia?',
            content: 'I am looking for information on the divorce process under Ethiopian family law. What are the steps and required documents?',
            category: 'FAMILY_LAW',
            tags: ['divorce', 'family law', 'procedure'],
            moderationStatus: 'APPROVED',
            moderatedBy: admin._id,
            moderatedAt: new Date()
        });

        await ForumPost.create({
            authorId: lawyer1._id,
            authorName: 'Tesfaye Bezabih',
            authorType: 'LAWYER',
            title: 'Understanding your rights as an employee in Ethiopia',
            content: 'Under the Labour Proclamation No. 1156/2019, employees have specific rights including...',
            category: 'LABOR_LAW',
            tags: ['labor law', 'employee rights', 'contract'],
            moderationStatus: 'APPROVED',
            moderatedBy: admin._id,
            moderatedAt: new Date()
        });

        console.log('✅ Forum posts created');

        // Seed Master Data for Verification
        console.log('🌱 Seeding master verification data...');
        
        await MasterLawyer.create([
            { licenseNumber: 'AAU/LAW/2010/089', lawyerName: 'Tesfaye Bezabih', specialization: ['Criminal Law', 'Family Law'], status: 'ACTIVE' },
            { licenseNumber: 'AAU/LAW/1998/045', lawyerName: 'Meaza Ashenafi', specialization: ["Women's Rights", 'Human Rights'], status: 'ACTIVE' },
            { licenseNumber: 'AAU/LAW/2015/123', lawyerName: 'Biruk Tsegaye', specialization: ['Commercial Law'], status: 'ACTIVE' },
            { licenseNumber: 'JLU/LAW/2020/056', lawyerName: 'Wondwossen Mulugeta', specialization: ['Criminal Defense'], status: 'ACTIVE' },
            { licenseNumber: 'AAU/LAW/2012/078', lawyerName: 'Sara Hailu', specialization: ['Family Law', 'Property Law'], status: 'ACTIVE' }
        ]);

        await MasterVolunteer.create([
            { studentId: 'VOL/AAU/2025/001', fullName: 'Yared Alemayehu', type: 'LAW_STUDENT', organization: 'Addis Ababa University', status: 'ACTIVE' },
            { studentId: 'VOL/EWLA/2025/002', fullName: 'Abebech Demeke', type: 'LEGAL_AID_WORKER', organization: 'Ethiopian Women Lawyers Association', status: 'ACTIVE' },
            { studentId: 'VOL/JU/2025/003', fullName: 'Tsegaye Mulugeta', type: 'LAW_STUDENT', organization: 'Jimma University', status: 'ACTIVE' },
            { studentId: 'VOL/MIZAN/2025/004', fullName: 'Genet Assefa', type: 'LEGAL_AID_WORKER', organization: 'Mizan Young Lawyers Centre', status: 'ACTIVE' }
        ]);

        await MasterProBono.create([
            { barLicenseNumber: 'AAU/LAW/2010/089', lawyerName: 'Tesfaye Bezabih', specialization: ['Domestic Violence', 'Land Rights'], status: 'ACTIVE' },
            { barLicenseNumber: 'AAU/LAW/1998/045', lawyerName: 'Meaza Ashenafi', specialization: ["Women's Rights"], status: 'ACTIVE' }
        ]);

        console.log('✅ Master verification data seeded');

        console.log('🎉 Database seeded successfully!');
        console.log('\nTest Accounts:');
        console.log('Admin: admin@legalassistance.et / Admin@123456');
        console.log('Lawyer: tesfaye@legalassistance.et / Admin@123456');
        console.log('Client: abebe@gmail.com / Admin@123456');
        console.log('Volunteer: mekdes@university.edu.et / Admin@123456');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

// Run seeder
seedDatabase();
