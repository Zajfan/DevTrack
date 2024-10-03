namespace DevTrack.DAL.Repositories
{
    public class Project
    {
        public object? ProjectName { get; internal set; }
        public object? ProjectStage { get; internal set; }
        public object? ProjectManager { get; internal set; }
        public object? StartDate { get; internal set; }
        public object? EstimatedCompletionDate { get; internal set; }
        public object? Description { get; internal set; }
        public object? Status { get; internal set; }
        public object? Priority { get; internal set; }
        public object? Budget { get; internal set; }
        public object? RepositoryURL { get; internal set; }
        public object? CategoryID { get; internal set; }
        public object? ProjectID { get; internal set; }
    }
}