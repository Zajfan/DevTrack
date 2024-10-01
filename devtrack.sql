CREATE DATABASE devtrack;

USE devtrack;

CREATE TABLE categories (
    CategoryID INT PRIMARY KEY AUTO_INCREMENT,
    CategoryName VARCHAR(255) NOT NULL
);

CREATE TABLE projects (
    ProjectID INT PRIMARY KEY AUTO_INCREMENT,
    ProjectName VARCHAR(255) NOT NULL,
    ProjectStage VARCHAR(20) NOT NULL,
    ProjectManager INT NOT NULL,
    StartDate DATE,
    EstimatedCompletionDate DATE,
    Budget DECIMAL(10 , 2 ),
    Description TEXT,
    Status VARCHAR(20) NOT NULL,
    Priority INT,
    RepositoryURL VARCHAR(255),
    CategoryID INT,
    FOREIGN KEY (CategoryID)
        REFERENCES categories (CategoryID)
);

CREATE TABLE tasks (
    TaskID INT PRIMARY KEY AUTO_INCREMENT,
    ProjectID INT NOT NULL,
    TaskName VARCHAR(255) NOT NULL,
    Description TEXT,
    AssignedTo INT NOT NULL,
    DueDate DATE,
    Status VARCHAR(20) NOT NULL,
    Priority INT,
    EstimatedTime INT,
    ActualTime INT
);

CREATE TABLE milestones (
    MilestoneID INT PRIMARY KEY AUTO_INCREMENT,
    ProjectID INT NOT NULL,
    MilestoneName VARCHAR(255) NOT NULL,
    Description TEXT,
    TargetDate DATE,
    Status VARCHAR(20) NOT NULL,
    CompletedDate DATE
);

CREATE TABLE users (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    UserName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL,
    Department VARCHAR(50)
);

CREATE TABLE documents (
    DocumentID INT PRIMARY KEY AUTO_INCREMENT,
    ProjectID INT NOT NULL,
    FileName VARCHAR(255) NOT NULL,
    FilePath VARCHAR(255) NOT NULL,
    UploadDate DATE,
    UploadedBy INT NOT NULL,
    DocumentType VARCHAR(50)
);

CREATE TABLE project_dependencies (
    DependencyID INT PRIMARY KEY AUTO_INCREMENT,
    ProjectID INT NOT NULL,
    DependsOnProjectID INT NOT NULL,
    FOREIGN KEY (ProjectID)
        REFERENCES projects (ProjectID),
    FOREIGN KEY (DependsOnProjectID)
        REFERENCES projects (ProjectID)
);

CREATE TABLE task_dependencies (
    DependencyID INT PRIMARY KEY AUTO_INCREMENT,
    TaskID INT NOT NULL,
    DependsOnTaskID INT NOT NULL,
    FOREIGN KEY (TaskID)
        REFERENCES tasks (TaskID),
    FOREIGN KEY (DependsOnTaskID)
        REFERENCES tasks (TaskID)
);

CREATE TABLE comments (
    CommentID INT PRIMARY KEY AUTO_INCREMENT,
    ProjectID INT,
    TaskID INT,
    UserID INT NOT NULL,
    CommentText TEXT NOT NULL,
    CommentDate DATETIME NOT NULL,
    FOREIGN KEY (ProjectID)
        REFERENCES projects (ProjectID),
    FOREIGN KEY (TaskID)
        REFERENCES tasks (TaskID),
    FOREIGN KEY (UserID)
        REFERENCES users (UserID)
);

-- Add foreign key from tasks to projects
ALTER TABLE tasks ADD FOREIGN KEY (ProjectID) REFERENCES projects(ProjectID);

-- Add foreign key from milestones to projects
ALTER TABLE milestones ADD FOREIGN KEY (ProjectID) REFERENCES projects(ProjectID);

-- Add foreign key from documents to projects
ALTER TABLE documents ADD FOREIGN KEY (ProjectID) REFERENCES projects(ProjectID);

-- Add foreign key from tasks to users
ALTER TABLE tasks ADD FOREIGN KEY (AssignedTo) REFERENCES users(UserID);

-- Add foreign key from documents to users
ALTER TABLE documents ADD FOREIGN KEY (UploadedBy) REFERENCES users(UserID);