-- MySQL dump 10.13  Distrib 9.3.0, for Win64 (x86_64)
--
-- Host: localhost    Database: it_support
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `anydeskdevices`
--

DROP TABLE IF EXISTS `anydeskdevices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anydeskdevices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `anydeskId` varchar(255) NOT NULL,
  `branch` varchar(255) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `anydeskdevices_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `anydeskdevices`
--

LOCK TABLES `anydeskdevices` WRITE;
/*!40000 ALTER TABLE `anydeskdevices` DISABLE KEYS */;
/*!40000 ALTER TABLE `anydeskdevices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customdatatables`
--

DROP TABLE IF EXISTS `customdatatables`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customdatatables` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tableName` varchar(255) NOT NULL,
  `tableData` text NOT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `createdBy` (`createdBy`),
  CONSTRAINT `customdatatables_ibfk_1` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customdatatables`
--

LOCK TABLES `customdatatables` WRITE;
/*!40000 ALTER TABLE `customdatatables` DISABLE KEYS */;
/*!40000 ALTER TABLE `customdatatables` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emailconfigs`
--

DROP TABLE IF EXISTS `emailconfigs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `emailconfigs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) DEFAULT NULL,
  `emailType` enum('imap','outlook') NOT NULL,
  `host` varchar(255) NOT NULL,
  `port` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `secure` tinyint(1) DEFAULT 1,
  `smtpHost` varchar(255) NOT NULL,
  `smtpPort` int(11) NOT NULL,
  `smtpUsername` varchar(255) NOT NULL,
  `smtpPassword` varchar(255) NOT NULL,
  `smtpSecure` tinyint(1) DEFAULT 1,
  `isActive` tinyint(1) DEFAULT 1,
  `signature` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `emailconfigs_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emailconfigs`
--

LOCK TABLES `emailconfigs` WRITE;
/*!40000 ALTER TABLE `emailconfigs` DISABLE KEYS */;
INSERT INTO `emailconfigs` VALUES (1,1,'imap','mail.3masegypt.com',993,'ahmed.saadany@3masegypt.com','bointeg@5fv',1,'mail.3masegypt.com',465,'ahmed.saadany@3masegypt.com','bointeg@5fv',1,1,'ahmed-saadany','2025-07-20 08:17:41','2025-07-20 08:17:41');
/*!40000 ALTER TABLE `emailconfigs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employeeId` varchar(255) NOT NULL,
  `fullName` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `emailPass` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `device` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`device`)),
  `location` enum('factor','maadi','oroba','mansoria','banisuef') NOT NULL,
  `position` varchar(255) DEFAULT NULL,
  `systemCode` varchar(255) DEFAULT NULL,
  `systemPass1` varchar(255) DEFAULT NULL,
  `systemPass2` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employeeId` (`employeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `errandrequests`
--

DROP TABLE IF EXISTS `errandrequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `errandrequests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reason` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `requestDate` datetime NOT NULL,
  `requesterName` varchar(255) NOT NULL,
  `requesterEmail` varchar(255) DEFAULT NULL,
  `requesterPhone` varchar(255) DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `description` text NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requestedBy` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `errand_requests_requested_by` (`requestedBy`),
  KEY `errand_requests_status` (`status`),
  KEY `errand_requests_priority` (`priority`),
  CONSTRAINT `errandrequests_ibfk_1` FOREIGN KEY (`requestedBy`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `errandrequests`
--

LOCK TABLES `errandrequests` WRITE;
/*!40000 ALTER TABLE `errandrequests` DISABLE KEYS */;
INSERT INTO `errandrequests` VALUES (1,'test','test','2025-07-21 00:00:00','user 1','user1@3mas.com','','high','test','pending',2,'2025-07-20 08:20:22','2025-07-20 08:20:22'),(2,'test 5','wert','2025-07-21 00:00:00','System Administrator','admin@company.com','','high','qwerqwer','pending',1,'2025-07-20 18:05:50','2025-07-20 18:05:50'),(3,'qwer','qwerqwe','2025-07-20 00:00:00','System Administrator','admin@company.com','','medium','qwer','pending',1,'2025-07-20 18:06:22','2025-07-20 18:06:22');
/*!40000 ALTER TABLE `errandrequests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `errands`
--

DROP TABLE IF EXISTS `errands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `errands` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) DEFAULT NULL,
  `reason` varchar(255) NOT NULL,
  `location` varchar(255) NOT NULL,
  `requestDate` date NOT NULL,
  `requesterName` varchar(255) NOT NULL,
  `requesterEmail` varchar(255) NOT NULL,
  `requesterPhone` varchar(255) DEFAULT NULL,
  `priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `description` text NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `errands_user_id` (`userId`),
  KEY `errands_status` (`status`),
  KEY `errands_priority` (`priority`),
  CONSTRAINT `errands_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `errands`
--

LOCK TABLES `errands` WRITE;
/*!40000 ALTER TABLE `errands` DISABLE KEYS */;
/*!40000 ALTER TABLE `errands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `managerpermissions`
--

DROP TABLE IF EXISTS `managerpermissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `managerpermissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `managerId` int(11) DEFAULT NULL,
  `resourceType` varchar(255) NOT NULL,
  `resourceName` varchar(255) NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `managerId` (`managerId`),
  CONSTRAINT `managerpermissions_ibfk_1` FOREIGN KEY (`managerId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `managerpermissions`
--

LOCK TABLES `managerpermissions` WRITE;
/*!40000 ALTER TABLE `managerpermissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `managerpermissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `text` varchar(255) NOT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,'test',1,'2025-07-20 11:08:39','2025-07-20 11:08:39');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissionrequests`
--

DROP TABLE IF EXISTS `permissionrequests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissionrequests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pageName` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `code` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `requestedBy` int(11) DEFAULT NULL,
  `attachment` varchar(255) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `permission_requests_requested_by` (`requestedBy`),
  KEY `permission_requests_status` (`status`),
  CONSTRAINT `permissionrequests_ibfk_1` FOREIGN KEY (`requestedBy`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissionrequests`
--

LOCK TABLES `permissionrequests` WRITE;
/*!40000 ALTER TABLE `permissionrequests` DISABLE KEYS */;
INSERT INTO `permissionrequests` VALUES (1,'تقارير','Finance','98','pending',2,NULL,'2025-07-20 08:15:12','2025-07-20 08:15:12');
/*!40000 ALTER TABLE `permissionrequests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shared_tasks`
--

DROP TABLE IF EXISTS `shared_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shared_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `text` varchar(255) NOT NULL,
  `created_by` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `frequency` enum('daily','once') NOT NULL DEFAULT 'once',
  `completed` tinyint(1) DEFAULT 0,
  `created_at` datetime NOT NULL,
  `notes` text DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `completion_history` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `shared_tasks_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `shared_tasks_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shared_tasks`
--

LOCK TABLES `shared_tasks` WRITE;
/*!40000 ALTER TABLE `shared_tasks` DISABLE KEYS */;
INSERT INTO `shared_tasks` VALUES (12,'test',1,NULL,'daily',0,'2025-07-20 15:57:23',NULL,'2025-07-20 15:58:04',1,'[{\"date\":\"2025-07-20T15:58:04.024Z\",\"userId\":1}]');
/*!40000 ALTER TABLE `shared_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticketattachments`
--

DROP TABLE IF EXISTS `ticketattachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticketattachments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fileName` varchar(255) NOT NULL,
  `originalName` varchar(255) NOT NULL,
  `filePath` varchar(255) NOT NULL,
  `fileSize` int(11) DEFAULT NULL,
  `mimeType` varchar(255) DEFAULT NULL,
  `ticketId` int(11) DEFAULT NULL,
  `uploadedBy` int(11) DEFAULT NULL,
  `commentId` int(11) DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ticketId` (`ticketId`),
  KEY `uploadedBy` (`uploadedBy`),
  KEY `commentId` (`commentId`),
  CONSTRAINT `ticketattachments_ibfk_1` FOREIGN KEY (`ticketId`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ticketattachments_ibfk_2` FOREIGN KEY (`uploadedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ticketattachments_ibfk_3` FOREIGN KEY (`commentId`) REFERENCES `ticketcomments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticketattachments`
--

LOCK TABLES `ticketattachments` WRITE;
/*!40000 ALTER TABLE `ticketattachments` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticketattachments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ticketcomments`
--

DROP TABLE IF EXISTS `ticketcomments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticketcomments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content` text NOT NULL,
  `ticketId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `isInternal` tinyint(1) DEFAULT 0,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ticketId` (`ticketId`),
  KEY `userId` (`userId`),
  CONSTRAINT `ticketcomments_ibfk_1` FOREIGN KEY (`ticketId`) REFERENCES `tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ticketcomments_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ticketcomments`
--

LOCK TABLES `ticketcomments` WRITE;
/*!40000 ALTER TABLE `ticketcomments` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticketcomments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` enum('open','in_progress','pending','resolved','closed') DEFAULT 'open',
  `category` varchar(255) DEFAULT NULL,
  `assignedTo` int(11) DEFAULT NULL,
  `createdBy` int(11) DEFAULT NULL,
  `resolvedAt` datetime DEFAULT NULL,
  `dueDate` datetime DEFAULT NULL,
  `report` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tickets_created_by` (`createdBy`),
  KEY `tickets_assigned_to` (`assignedTo`),
  KEY `tickets_status` (`status`),
  KEY `tickets_priority` (`priority`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`assignedTo`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `todos`
--

DROP TABLE IF EXISTS `todos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `todos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `text` varchar(255) NOT NULL,
  `priority` enum('low','medium','high') DEFAULT 'medium',
  `completed` tinyint(1) DEFAULT 0,
  `created_by` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `todos_created_by` (`created_by`),
  KEY `todos_completed` (`completed`),
  KEY `todos_priority` (`priority`),
  CONSTRAINT `todos_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `todos`
--

LOCK TABLES `todos` WRITE;
/*!40000 ALTER TABLE `todos` DISABLE KEYS */;
/*!40000 ALTER TABLE `todos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `todoshares`
--

DROP TABLE IF EXISTS `todoshares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `todoshares` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `todoId` int(11) DEFAULT NULL,
  `sharedWithUserId` int(11) DEFAULT NULL,
  `shared_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `todoId` (`todoId`),
  KEY `sharedWithUserId` (`sharedWithUserId`),
  CONSTRAINT `todoshares_ibfk_1` FOREIGN KEY (`todoId`) REFERENCES `todos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `todoshares_ibfk_2` FOREIGN KEY (`sharedWithUserId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `todoshares`
--

LOCK TABLES `todoshares` WRITE;
/*!40000 ALTER TABLE `todoshares` DISABLE KEYS */;
/*!40000 ALTER TABLE `todoshares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','manager','user') DEFAULT 'user',
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `isActive` tinyint(1) DEFAULT 1,
  `lastLogin` datetime DEFAULT NULL,
  `emailSignature` text DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@company.com','$2a$12$ZcZoVeunVpGE0K0FAva3Tutwf6C76aqZq.oO4vcPi.Nk4VfWAqLYC','admin','System','Administrator','IT',NULL,1,NULL,NULL,'2025-07-20 08:14:09','2025-07-20 08:14:09'),(2,'user1','user1@3mas.com','$2a$12$axs36Xtpb/098w4lFBIPJO8j7Ig/bdHPuqhIbs84Dys3esZYa6fFa','user','user','1','','',1,NULL,NULL,'2025-07-20 08:15:00','2025-07-20 08:15:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usersettings`
--

DROP TABLE IF EXISTS `usersettings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usersettings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) DEFAULT NULL,
  `theme` varchar(255) DEFAULT 'light',
  `notifications` tinyint(1) DEFAULT 1,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`),
  CONSTRAINT `usersettings_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usersettings`
--

LOCK TABLES `usersettings` WRITE;
/*!40000 ALTER TABLE `usersettings` DISABLE KEYS */;
/*!40000 ALTER TABLE `usersettings` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-20 21:24:34
